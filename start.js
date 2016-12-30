var request = require('request');
// var cheerio = require('cheerio');
// var async = require('async');
// var fs = require('fs');

var indexOption = {
    url: 'http://acm.hdu.edu.cn',
    jar: true,
    headers: {
         cookie: 'PHPSESSID=hdn7jgfe2llrvh9ajr8u6lmmn0; CNZZDATA1254072405=713557432-1482927676-null%7C1483076748',
         Connection: 'keep-alive'
    }
}
var req = function() {
    request(indexOption, function(error, response, body) {
        if (error) {
            console.log(error)
        } else {
            console.log(body)
            console.log(response.headers)
        }
    })
}
req()

// var loginOption = {
//     url: 'http://acm.hdu.edu.cn/userloginex.php?action=login',
//     formData: {
//         username: '572058317',
//         userpass: 'nibushi12',
//         login: 'Sign In'
//     },
//     jar: true,
//     headers: {
//         cookie: {
//             PHPSESSID: 'hdn7jgfe2llrvh9ajr8u6lmmn0',
//             CNZZDATA1254072405: '713557432-1482927676-null%7C1483071347'
//         },
//         Connection: 'keep-alive'
//     }
// }
// var postLogin = function() {
//     request.post(loginOption, function(error, response, body) {
//         if (error) {
//             console.log(error)
//         } else {
//             console.log(response.headers)
//         }
//     });
// }
//postLogin()