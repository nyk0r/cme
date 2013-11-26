var http = require('http'),
    url = require('url'),
    fs = require('fs'),
    srv;

function handleStaticFile (url, res) {
    var types = {
            '\.html$': 'text/html',
            '\.js$': 'text/javascript',
            '\.css$': 'text/css'
        }, 
        type = 'binary/octet-stream';

    for (var pattern in types) {
        if ((new RegExp(pattern, 'i')).test(url)) {
            type = types[pattern];
        }
    }

    fs.readFile(__dirname + url, function (err, data) {
        if (err) {
            res.writeHead(500, {
                'Content-Type': 'text/plain'
            });
            res.end(JSON.stringify(err));
            return;
        }
        res.writeHead(200, {
            'Content-Type': type
        });
        res.end(data);
    });
}

function handleMultipart (res, count) {
    var partNumber = 0, 
        hsl = { hue: 0, saturation: 45, lightness: 45 },
        boundary = (+ new Date) + '===',
        closed = false;

    function formatResponsePart (type, content, separator) {
        return [
            separator,
            'Content-Type: ' + type,
            '',
            content,
            ''
        ].join('\r\n');
    }

    function sendPart () {
        if (closed) return;

        var id = hsl.hue + '-' + hsl.saturation + '-' + hsl.lightness,
            hsla = 'hsla(' + hsl.hue + ',' + hsl.saturation + '%,' + hsl.lightness + '%, 1)';

        res.write(formatResponsePart(
            'text/css', 
            '.brick-' + id + '{ background-color:' + hsla + '}',
            '--' + boundary + ';' + partNumber++
        ));

        res.write(formatResponsePart(
            'text/javascript', 
            'addBrick("' + id + '")',
            '--' + boundary + ';' + partNumber++
        ));

        hsl.hue++;
        if (hsl.hue > 360) {
            hsl.hue = 0;
            hsl.saturation++;
            if (hsl.saturation > 100) {
                hsl.saturation = 45;
            }
        }

        if (!count || partNumber < count) {
            setImmediate(sendPart);
        } else {
            res.end('--' + boundary + '--');
        } 
    }

    res.on('close', function () {
        closed = true;
    });

    res.writeHead(200, {
        'Content-Type': 'multipart/mixed; boundary=' + boundary,
        'X-Part-Number-Start': partNumber
    });
    setImmediate(sendPart);    
}

srv = http.createServer(function (req, res) {
    if (/^\/multipart/.test(req.url)) {
        handleMultipart(res, url.parse(req.url, true).query.count);
    } else if (['/', '/index.html', '/client.js', '/style.css'].indexOf(req.url) != -1) {
        handleStaticFile(req.url !== '/' ? req.url : '/index.html', res)
    } else {
        res.writeHead(404, {
            'Content-Type': 'text/plain'
        });
        res.end('Not Found');
    }
});

srv.listen(4242, function () {
    console.log('Listening on port 4242');
});
