const https = require("https");

type ResponseObject = {
    access_token: string
}

module.exports = {
getAT: function(){
    var getOptions = {
      host: "sandbox.safaricom.co.ke",
      path: "/oauth/v1/generate?grant_type=client_credentials",
      method: "GET",
      headers: {
        "Authorization": "Basic " + Buffer.from(process.env.CK
          + ":" + process.env.CS).toString("base64"),
          "Accept":"application/json"
      }
    }
return new Promise(function(resolve, reject) {
      https.request(getOptions, function(res:any) {
        res.setEncoding("utf-8");
        res.on("data", function(d:any) {
          resolve(JSON.parse(d));
        });
        res.on("error", function(e:any) {
          reject(e);
        });
      }).end();
    });
},
  getTimeStamp: function() {
    function parseDate(e:number) { return (e < 10) ? "0" + e : e; }
    var _date = new Date();
    var currentTime = new Date();
        // new Date(_date.toLocaleString("en-us", {timeZone: "Africa/Nairobi"}));
        console.log("CURRENT", currentTime)
    var month = parseDate(currentTime.getMonth() + 1);
    var date = parseDate(currentTime.getDate());
    var hour = parseDate(currentTime.getHours());
    var minutes = parseDate(currentTime.getMinutes());
    var seconds = parseDate(currentTime.getSeconds());
    console.log("TIMESTAMP",currentTime.getFullYear() + "" + month + "" + date + "" + 
    hour + "" + minutes + "" + seconds)
    const time = currentTime.getFullYear() + "" + month + "" + date + "" + 
        hour + "" + minutes + "" + seconds;
        time.toString()
        return time
  },
  processRequest: function(amount:string, msidn:string) {
    var postBody = JSON.stringify({
     "BusinessShortCode": Number(process.env.SC),
     "Password": Buffer.from(
                             Number(process.env.SC) + (process.env.PK || "") +
                             module.exports.getTimeStamp())
                             .toString("base64"),
     "Timestamp": module.exports.getTimeStamp(),
     "TransactionType": "CustomerPayBillOnline",
     "Amount": amount,
     "PartyA": msidn,
     "PartyB": Number(process.env.SC),
     "PhoneNumber": msidn,
     "CallBackURL": "https://expressjs-postgres-production-ac2c.up.railway.app/api/v1/mpesa/hooks/lnmResponse",
     "AccountReference": "WebAssignmets",
     "TransactionDesc": "Payment For Assignments",
    });
/*This generates an access_token for each request, and 
      returns a promise.*/
    var aTPromise = module.exports.getAT();
    return aTPromise.then(function(resObj:ResponseObject) {
      return resObj["access_token"];
    }, function() {
      return "";
    }).then(function(_at:string) {
      /*If access_token is valid, proceed to invoke the LNM API*/
      var postOptions = {
          host: "sandbox.safaricom.co.ke",
          path: "/mpesa/stkpush/v1/processrequest",
          method: "POST",
          headers: {
            "Authorization": "Bearer " + _at,
            'Content-Type' : 'application/json',
            'Content-Length' : Buffer.byteLength(postBody, 'utf8')
          }        
      }
      return new Promise(function(resolve, reject) {
        var post = https.request(postOptions, function(res:any) {
          res.setEncoding("utf-8");
          res.on("data", function(d:any) {
            console.log("RESOLVE FUNC", d)
            resolve(JSON.parse(d));
          });
          res.on("error", function(e:any) {
            console.log("REJECT FUNC", e)
            reject(e);
          });
        });
        post.write(postBody);
        post.end();
      });
    });
  }
 
  /* Delimit functions within the module.exports section using a comma*/
};
