const request = require('request')
const Iconv   = require('iconv-lite')
const async   = require('async')
const fs      = require('fs')

var userData  = new Object()
var codeUrls  = new Array()

const webSite = 'http://acm.hdu.edu.cn'

// 类: 带有登录状态的请求头(request headers)
var onlineOption = function (url) {
    this.url = url,
    this.encoding = null
    this.headers  = {
        cookie: userData.session
    }
}

/**
 * ------------------------------------------------------------------------
 * 在loginOption设置formData去post登录地址,返回的response.headers中
 * 有个'set-cookie'属性, 
 * ------------------------------------------------------------------------
 */

function login(username, userpass, callback) {
    userData.username = username
    userData.userpass = userpass
    var loginOption = {
        url: webSite + '/userloginex.php?action=login',
        // encoding设null，供iconv-lite模块转码
        encoding: null,
        formData: {
            username: username,
            userpass: userpass,
            login: 'Sign In'
        }
    }
    loginPost(loginOption, callback)
}

function loginPost(loginOption, callback) {
    request.post(loginOption, function(error, response, body) {
        if (error) {
            console.log(error+"login post error")
        } else {
            userData.session = response.headers['set-cookie']
            callback(null, true)
        }
    })
}

/**
 * ------------------------------------------------------------------------
 * 访问用户信息页面用(/<\/td><\/tr>/g)刚好匹配到一个用户信息的数组
 * ------------------------------------------------------------------------
 */
function requestUserInfo(callback) {
    var option = new onlineOption(webSite 
    + '/userstatus.php?user=' + userData.username)
    request(option, function(error, response, body) {
        if(error) {
            console.log(error + 'user info request error')
        } else {
            analyseInfoPage(body,callback)
        }
    })
}

function analyseInfoPage(body,callback) {
    if(/action=logout/g.test(body)){
        // iconv-lite模块将gb2312转码为utf-8
        body = Iconv.decode(body, 'gb2312').toString()
        console.log('---登录成功---')
        var name = body.match(/>.*(?=<\/h1>)/g)[0].substr(1)
        var userInfoList = body.match(/\d+(?=<\/td><\/tr>)/g)
        userData.name = name,
        userData.rank = userInfoList[0],
        userData.submit = userInfoList[3],
        userData.accept = userInfoList[4],
        userData.solved = userInfoList[2],
        printUserData(userData)
        callback(null, true)
    } else {
        console.log('登录失败, 请检查账号密码')
    }
}

function printUserData(userData) {
	console.log(
		'账号: ' + userData.username
		+ '\n昵称: ' + userData.name
		+ '\nHDU rank: ' + userData.rank
		+ '\nsubmit: ' + userData.submit
		+ '\naccpet: ' + userData.accept
		+ '\nsolved: ' + userData.solved 
	)
}


/**
 * ------------------------------------------------------------------------
 * 在查找页面(judge status)正则匹配所有代码的地址，以及如果匹配到下一页链接，就递归
 * 执行此函数
 * ------------------------------------------------------------------------
 */
function requestCodeUrls(callback) {
	// 首次执行，初始化searchUrl
    if(!codeUrls.length) {
        var option = new onlineOption(webSite 
        + '/status.php?first=&pid=&user=' 
        + userData.username + '&lang=0&status=5')
    }
    requestNextCodeUrlsPage(option, callback)
}

function requestNextCodeUrlsPage(option, callback) {
    request(option, function(error, response, body) {
        if(error) {
            console.log(error + 'serach request error')
        } else {
            analyseCodeUrlsPage(body,callback)
        }
    })
}

function analyseCodeUrlsPage(body,callback) {
    // iconv-lite模块将gb2312转码为utf-8
    body = Iconv.decode(body, 'gb2312').toString()
    var codeUrl = body.match(/\/viewcode\.php\?rid=\d+/g)
    codeUrls = codeUrls.concat(codeUrl)
    var next = body.match(/\/status\.php\?first=.*(?=">Next)/g)
    if(next) {
        option = new onlineOption(webSite + next[0])
        requestNextCodeUrlsPage(option, callback)
    } else {
        callback(null, true)
    }
} 

/**
 * ------------------------------------------------------------------------
 * async模块限制requestAndSaveCode函数最大并发为5
 * ------------------------------------------------------------------------
 */

function requestCodesLimit(callback) {
    console.log('开始请求所有代码')
    console.log('代码数： ' + codeUrls.length + '\t并发: 5')
	async.mapLimit(codeUrls, 5, function(url, callback) {
		requestAndSaveCode(url, callback)
	},function(error,result) {
		if(!error) {
			console.log("全部执行完毕")
			callback(null , 'limit successful')
		}
	})
}

/**
 * ------------------------------------------------------------------------
 * request代码页面，正则匹配代码部分和标题，并保存
 * ------------------------------------------------------------------------
 */

function requestAndSaveCode (url, callback) {
    var option = new onlineOption(webSite + url)
	request(option, function(error,response,body) {
		if(error) {
			console.log(error + 'code request error' + url)
		} else {
            analyseCodePage(body, callback)
		}
	})
}
function analyseCodePage(body, callback) {
    // iconv-lite模块将gb2312转码为utf-8
    body = Iconv.decode(body, 'gb2312').toString()
    // 一开始用'#include'匹配，换其他人账号有错误，检查发现该代码
    // 是'# include'开头......
    var code = body.match(/#\s*include[\w\W]*(?=<\/textarea>)/g)[0]
    code = escape(code)
    var problem = body.match(/\d{4}\s.*\)(?=<\/a>)/g)[0]
    var problemID = 'hdu' + problem.match(/\d{4}/g)[0]
    var stars = '*************************************************'
    var comment = '\n/' + stars + '\nProblem: HDU' + problem 
                + '\nLanguage: C/C++\n'+'Author: ' + userData.username 
                + '(' + userData.name +')\n' + stars + '/\n\n'
    fs.appendFile('cpps/' + problemID + '.cpp',comment + code)
    callback(null, 'save successful')
}
/**
 * ------------------------------------------------------------------------
 * HTML里嵌的代码都进行了转义，反转义函数
 * ------------------------------------------------------------------------
 */

function escape(data) {
    return data.replace(/&quot;/g,'\"')
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g, ">")
}


/**
 * ------------------------------------------------------------------------
 * async模块进行流程控制，简化回调函数
 * ------------------------------------------------------------------------
 */
function start(username,userpass) {
    async.series({
        login: function(callback) {
            login(username, userpass, callback)
        },
        requestUserInfo: function(callback) {
            requestUserInfo(callback)
        },
        requestProblemUrls: function(callback) {6
            requestCodeUrls(callback)
        },
        requestCodesLimit: function(callback) {
            requestCodesLimit(callback)
        }
    }, function(err, results) {
        if(!err) {
            console.log('---结束---')
        }
    })
}

exports.start = start
