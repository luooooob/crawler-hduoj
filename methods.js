const request  = require('request')
const Iconv = require('iconv-lite')
const async = require('async')
const fs = require('fs')

/**
 * ------------------------------------------------------------------------
 * 配置账号密码
 * ------------------------------------------------------------------------
 */

const username = '572058317'
const userpass = 'nibushi12'

/**
 * ------------------------------------------------------------------------
 */

const webSite   = 'http://acm.hdu.edu.cn'
const loginUrl  = webSite + '/userloginex.php?action=login'
const infoUrl   = webSite + '/userstatus.php?user=' + username
const searchUrl = webSite + '/status.php?first=&pid=&user=' 
                + username + '&lang=0&status=5'

var userData = new Object()
var codeUrls = new Array()

var loginOption = {
    url: loginUrl,
    // encoding设null，供iconv-lite模块转码
    encoding: null,
    formData: {
        username: username,
        userpass: userpass,
        login: 'Sign In'
    }
}

var onlineOption = {
    encoding: null,
    setCookie: function(session) {   
      this.headers = {cookie: session}
    }
}

/**
 * ------------------------------------------------------------------------
 * async模块进行流程控制，简化回调函数
 * ------------------------------------------------------------------------
 */
exports.start = async.series({
    login: function(callback) {
        login(callback)
    },
    requestUserInfo: function(callback) {
        requestUserInfo(callback)
    },
    requestProblemUrls: function(callback) {
        requestProblemUrls(callback)
    },
	limit: function(callback) {
		limit(callback)
	}
},function(err, results) {
    if(!err) {
		console.log('---结束---')
	} 
})


/**
 * ------------------------------------------------------------------------
 * 在loginOption设置formData去post登录地址,返回的response.headers中
 * 有个'set-cookie'属性, 将这个属性的值直接设为后面所有网址请求的cookie，
 * 后面的请求就有这个账号的登录状态
 * ------------------------------------------------------------------------
 */

function login(callback) {
	request.post(loginOption, function(error, response, body) {
        if (error) {
            console.log(error+"login post error")
        } else {
            var session = response.headers['set-cookie']
            onlineOption.setCookie(session)
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
    onlineOption.url = infoUrl
    // console.log(onlineOption)
    request(onlineOption, function(error, response, body) {
        if(error) {
            console.log(error + 'user info request error')
        } else if(/action=logout/g.test(body)){
            //用iconv-lite模块将gb2312转码成utf-8
            body = Iconv.decode(body, 'gb2312').toString()
            console.log('登录成功')
            var name = body.match(/>.*(?=<\/h1>)/g)[0].substr(1)
            var userInfoList = body.match(/\d+(?=<\/td><\/tr>)/g)
            userData = {
                name: name,
                rank: userInfoList[0],
                submit: userInfoList[3],
                accept: userInfoList[4],
                solved: userInfoList[2],
            }
            callback(null, true)
        } else {
            console.log('登录失败, 请检查账号密码')
        }
    })
}


/**
 * ------------------------------------------------------------------------
 * 在查找页面(judge status)正则匹配所有查看代码地址，如果匹配到还有下一页，就递归执行
 * 此函数
 * ------------------------------------------------------------------------
 */
function requestProblemUrls(callback) {
	// 第一次执行要初始化searchUrl
    if(!codeUrls.length) {
        onlineOption.url = searchUrl
    }
    request(onlineOption, 
    function(error, response, body) {
        if(error) {
            console.log(error + 'serach request error')
        } else {
            body = Iconv.decode(body, 'gb2312').toString()
            var codeUrl = body.match(/\/viewcode\.php\?rid=\d+/g)
            codeUrls = codeUrls.concat(codeUrl)
            var next = body.match(/\/status\.php\?first=.*(?=">Next)/g)
            if(next) {
                onlineOption.url = webSite + next[0]
                requestProblemUrls(callback)
            } else {
                callback(null, true)
            }
        }
    })
}

/**
 * ------------------------------------------------------------------------
 * async模块限制requestAndSaveCode函数最大并发为5
 * ------------------------------------------------------------------------
 */

function limit(callback) {
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
	onlineOption.url = webSite + url
	request(onlineOption, function(error,response,body) {
		if(error) {
			console.log(error + 'code request error')
		} else {
			body = Iconv.decode(body, 'gb2312').toString()
			var code = body.match(/#include[\w\W]*(?=<\/textarea>)/g)[0]
			code = escape(code)
			var problem = body.match(/\d{4}\s.*\)(?=<\/a>)/g)[0]
			var problemID = 'HDU' + problem.match(/\d{4}/g)[0]
			var stars = '*************************************************'
			var comment = '\n/' + stars + '\nProblem: HDU'+ problem 
						+ '\nLanguage: C/C++\n'+'Author: '+ userData.name 
						+'\n' + stars + '/\n\n'
			fs.appendFile('./cpp/' + problemID + '.cpp',comment + code)
			callback(null, 'save successful')
		}
	})
}

/**
 * ------------------------------------------------------------------------
 * HTML里的代码都进行了转义，反转义函数
 * ------------------------------------------------------------------------
 */

function escape(data) {
    return data.replace(/&quot;/g,'\"')
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g, ">")
}
