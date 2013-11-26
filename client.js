(function (wnd) {
    var doc = wnd.document;

    wnd.addBrick = function (cls) {
        var brick = doc.createElement('div'),
            now = new Date;
        brick.className = 'brick-' + cls;
        brick.innerHTML = now.getMinutes() + ':' + now.getSeconds();
        doc.body.appendChild(brick);
    }

    wnd.handleCss = function (content) {
        var css = doc.getElementById('dynamic-styles');
        if (!css) {
            css = doc.createElement('style');
            css.type = 'text/css';
            css.id = 'dynamic-styles';
        }
 
        if (css.styleSheet) { // ie
            css.styleSheet.cssText += content;
        } else {
            if (!css.hasChildNodes()) {
                css.appendChild(
                    doc.createTextNode(content) // webkit hack
                );
            } else {
                css.firstChild.textContent += content;
            }                
        }
        doc.head.appendChild(css);
    }

    wnd.handleJs = function (content) {
        wnd.eval(content);
    }

    wnd.getBoundary = function (header) {
        var boundary = /\bboundary=(.*)/.exec(header);
        return boundary[1].replace(/^[ \t"]+|[ \t"]+$/g, '');
    }

    wnd.parseEntries = function (text, boundary) {
        var PARSING_HEADERS = 0, PARSING_BODY = 1,
            parts = text.split('\r\n'),
            entries = [],
            current,
            idx, part, state,
            match;

        for (idx = 0; idx < parts.length; idx++) {
            part = parts[idx];

            if (part.indexOf(boundary) !== -1) {
                if (current) {
                    current.body = current.body.join('\r\n');
                    entries.push(current);
                }
                if (part.indexOf('--' + boundary + '--') !== -1) {
                    return entries;
                }

                current = { headers: {}, body: [] };
                state = PARSING_HEADERS;
            } else {
                if (PARSING_HEADERS === state) {
                    if (!part.trim()) {
                        state = PARSING_BODY;
                    } else {
                        match = /^(\S+):[ \t]*(.+)[ \t]*$/i.exec(part);
                        current.headers[match[1]] = match[2];
                    }
                } else if (PARSING_BODY === state) {
                    current.body.push(part);
                }
            }   
        }

        return entries;
    }

    wnd.handleMultipart = function (url) {
        var xhr = new XMLHttpRequest(),
            boundary, partNumber, handler;

        function parseLoaded () {
            var responseText = xhr.responseText,
                start = responseText.indexOf('--' + boundary + ';' + partNumber), 
                entries = wnd.parseEntries(responseText.substr(start), boundary);

            entries.forEach(function (item) {
                if (item.headers['Content-Type'] === 'text/css') {
                    wnd.handleCss(item.body);
                } else if (item.headers['Content-Type'] === 'text/javascript') {
                    wnd.handleJs(item.body);
                }
            });
            partNumber += entries.length;
        }

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 2) {         // HEADERS_RECEIVED
                boundary = wnd.getBoundary(xhr.getResponseHeader('Content-Type'))
                partNumber = parseInt(xhr.getResponseHeader('X-Part-Number-Start'), 10);
            } else if (xhr.readyState === 3) {  // LOADING
                if (!handler)
                    handler = setInterval(parseLoaded, 15);
            } else if (xhr.readyState === 4) {  // DONE
                clearInterval(handler);
                setTimeout(parseLoaded, 15);
                parseLoaded();
            }
        }
        xhr.open('GET', url);
        xhr.send(null);
    }
})(window);
