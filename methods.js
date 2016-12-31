const request  = require('request')
const Iconv = require('iconv-lite')
const async = require('async')


/* =================================================================
    配置账号密码
================================================================= */
const username = '572058317'
const userpass = 'pass'


// 部分网址常量
const webSite   = 'http://acm.hdu.edu.cn'
const loginUrl  = webSite + '/userloginex.php?action=login'
const infoUrl   = webSite + '/userstatus.php?user=' + username
const searchUrl = webSite + '/status.php?first=&pid=&user=' 
                + username + '&lang=0&status=5'

// userData,用于保存所有用户信息
var userData = {
    name: '',
    rank: '',
    submit: '',
    accept: '',
    solved: '',
    codeUrls: new Array()
}

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

/* =================================================================
    在loginOption设置formData去post登录地址,返回的response.headers中
    有个'set-cookie'属性, 将这个属性的值直接设为后面所有网址请求的cookie，
    后面的请求就有这个账号的登录状态
================================================================= */
const login = function(callback) {
    request.post(loginOption, function(error, response, body) {
        if (!error) {
            var session = response.headers['set-cookie']
            onlineOption.setCookie(session)
            callback(getProblemUrls)
        }
    })
}


const requestUserInfo = function() {
    onlineOption.url = infoUrl
    request(onlineOption, function(error, response, body) {
        if(!error&&/action=logout/g.test(body)){
            //用iconv-lite模块将gb2312转码成utf-8
            body = Iconv.decode(body, 'gb2312').toString()
            console.log('登录成功')
            var name = body.match(/>.*(?=<\/h1>)/g)[0].substr(1)
            var infoList = body.match(/\d+(?=<\/td><\/tr>)/g)
            userData = {
                name: name,
                rank: infoList[0],
                submit: infoList[3],
                accept: infoList[4],
                solved: infoList[2]
            } 
        } else {
            console.log('登录失败, 请检查账号密码')
        }
    })
}

const getProblemUrls = function(callback) {
    console.log(onlineOption)
    if(!userData.codeUrls.length) {
        onlineOption.url = searchUrl
    }
    request(onlineOption, 
    function(error, response, body) {
        if(error) {
            console.log(error)
        }
        if(!error) {
            body = Iconv.decode(body, 'gb2312').toString()
            var codeUrls = body.match(/\/viewcode\.php\?rid=\d+/g)
            userData.codeUrls += codeUrls
            var next = body.match(/\/status\.php\?first=.*(?=">Next)/g)
            if(next) {
                onlineOption.url = webSite + next
                callback(getProblemUrls)
            } else {
                console.log(userData.codeUrls.split(',').length)
                return
            }
        }
    })
}

exports.start = function() {
    login(getProblemUrls)
}