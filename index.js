var net = require('net');
var http = require("http");
var appInsights = require("applicationinsights");

appInsights
    .setup("4e4b8ff4-6095-4ee0-a288-0f639aa674d8")
    .enableVerboseLogging()
    .setAutoCollectRequests(false)
    .setAutoCollectPerformance(false)
    .setAutoCollectExceptions(false)
    .start();

appInsights.client.commonProperties = {
    environment: 'FASTLY'
};

var server = net.createServer(function(socket) {

  // Handle incoming messages from clients.
  console.log(`client connected`);

  // Handle incoming messages from clients.
  socket.on('data', function (data) {
    //console.log(`>  ${data.toString()}`);
    for (let l of data.toString().split(/\n/)) {
       if (l.length > 0) {
            console.log (`raw> ${l}`);
            /* will match:
                (
                    ".*?"       double quotes + anything but double quotes + double quotes
                    |           OR
                    [^",\s]+    1 or more characters excl. double quotes, comma or spaces of any kind
                )
                (?=             FOLLOWED BY
                    \s*,        0 or more empty spaces [and a comma -REMOVED]
                    |           OR
                    \s*$        0 or more empty spaces and nothing else (end of string)
                )
            */
            // FASTLY Version2 Log Format: "%h" %l %u "%t" %T %D "%{req.request}V %{req.url}V" %>s %{resp.http.Content-Length}V "%{req.http.User-Agent}V"
            let [logdate, cachelabel, logserver, remoteip, remotelog, remoteuser, timereceived, timetoservinsec, timetoservinmsec, requestverbpath, status, contentsize, useragent  ] = l.replace(/^(<134>)/,"").match(/(".*?"|[^",\s]+)(?=\s*|\s*$)/g)
            let req = {
                    method: requestverbpath.replace(/\"/g,'').split(' ')[0],
                    url: requestverbpath.replace(/\"/g,'').split(' ')[1],
                    pathname: requestverbpath.replace(/\"/g,'').split(' ')[1],
                    host: cachelabel,
                    headers: {
                        "user-agent" : useragent.replace(/\"/g,''),
                    }
                },
                res = { 
                    statusCode: status
                },
                ellapsedMilliseconds = Math.round(parseInt(timetoservinmsec)/1000), //from micro to Milli
                ml_reg = req.pathname.match(/^\/(.*?)\/.*/),
                ql_reg = req.pathname.match(/\/QualityLevels\((.*?)\).*/),
                properties = {
                    reqtype: "CDN",
                    MediaLocator: ml_reg && ml_reg.length>1 && ml_reg[1],
                    QualityLevels: ql_reg && ql_reg.length>1 && ql_reg[1],
		    "user-agent": req.headers["user-agent"]
                },
                error = (parseInt(status) == 200) ? null : `status ${status}`

            console.log (`> ${JSON.stringify(req)} ${JSON.stringify(res)}  ${ellapsedMilliseconds} ${JSON.stringify(properties)} ${error}`)
            if (true) {
                appInsights.client.trackRequestSync(req, res, ellapsedMilliseconds, properties,error)
            }
        }
    }
  });

  // Handle incoming messages from clients.
  socket.on('error', function (err) {
    console.log(`Error: ${socket.name} >  ${err}`);
  });

  // Remove the client from the list when it leaves
  socket.on('end', function () {
    console.log(`client disconnected`);
  });
});

let port = 1337,
    host =  '172.16.0.4';

console.log (`listening on ${host}:${port}`)
server.listen(port, host)
