var request = require('request');
var cheerio = require('cheerio');
// var async = require('async');
// var fs = require('fs');


var username = '572058317' 
var userpass = 'nibushi12'
var loginUrl = 'http://acm.hdu.edu.cn/userloginex.php?action=login'

var signedOption = {
    set: function() {
      this.url = 'http://acm.hdu.edu.cn/userstatus.php?user=' + username,   
      this.headers = {cookie: session}
    }
}

var loginOption = {
    set: function() {
        this.url = 'http://acm.hdu.edu.cn/userloginex.php?action=login'
        this.formData = {
            username: username,
            userpass: userpass,
            login: 'Sign In'
        }
    }
}

var login = function(callback) {
    loginOption.set()
    request.post(loginOption, 
    function(error, response, body) {
        if (error) {
            console.log(error)
        } else {
            session = response.headers['set-cookie']
            signedOption.set()
            return callback()
        }
    });
}

var getProblemUrls = function() {
    request(signedOption,
    function(error, response, body) {
        if(!error){
            $ = cheerio.load(body);
            if($('img[alt = "Sign Out"]').length) {
                console.log('signing')
            }
            if($('input[value = "Sign In"]').length) {
                console.log('no sign')
            }
        }
    })
}

login(getProblemUrls)