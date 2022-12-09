function Heatmap(canvasId, config) {

    let clientW = document.body.clientWidth;
    let clientH = document.body.clientHeight;
    let w, h;
    
    let canvas = document.getElementById(canvasId);
    let ctx = canvas.getContext('2d');
    let hoverCap = clientW< 650 ? 100 : (clientW / 7.75);

    let desktopSize = config.desktopSize;
    let mobileSize = config.mobileSize;
    let hoverMarkerSize, clickMarkerSize;
    let alpha = config.alpha ? config.alpha : 0.05;

    let currX, currY;
    let isFullPage = false;
    let data;

    function init() {
        resetData();

        // Set canvas size
        sizeToScreen(canvas);
        window.addEventListener('resize', onResize);
        
        // Register event listeners
        document.addEventListener('mousemove', setPos);
        document.addEventListener('mousedown', debounced(addClick, 50));
        document.addEventListener('touchstart', setPos);
        document.addEventListener('touchmove', setPos);

        setInterval(addHover, 5);
        setInterval(draw, 100);
    }

    function resetData() {
        // Initialize 2d array (map) of 
        // size clientWidth x clientHeight
        data = new Array(clientW);
        for(let i = 0; i < data.length; i++) {
            data[i] = new Array(clientH);
        }
    }

    function onResize() {
        resetData();
        sizeToScreen();
    }

    function sizeToScreen() {
        isFullPage = false;
        canvas.classList.remove("fullpage")

        if(document.body.clientWidth < 650) {
            canvas.width = mobileSize;
            canvas.height = mobileSize;
        }
        else {
            canvas.width = desktopSize;
            canvas.height = desktopSize;
        }
        w = canvas.width;
        h = canvas.height;

        clickMarkerSize = w / 50;
        hoverMarkerSize = w / 10;
    }

    function toggleFullPage() {
        if(isFullPage) {
            isFullPage = false;
            sizeToScreen(canvas);
            canvas.classList.remove("fullpage")
            alpha = 0.01;
        }

        else {
            isFullPage = true;

            canvas.width = document.body.scrollWidth;
            canvas.height = document.body.scrollHeight;
            w = canvas.width;
            h = canvas.height;

            clickMarkerSize = 5;
            hoverMarkerSize = w / 15;

            canvas.classList.add("fullpage")
        }
    }

    function add(x, y, event) {
        // Make sure row exists
        data[x] = data[x] ? data[x] : new Array(clientW);

        // Upsert point data
        let current = data[x][y];
        if(current) {
            let currValue = data[x][y][event];
            data[x][y][event] = Math.min(currValue + 1, hoverCap);
        }
        else {
            data[x][y] = {
                x: x, 
                y: y, 
                hover: 0, 
                click: 0
            };
            data[x][y][event]++;
        }
    }

    function addClick(e) {
        if(e) {
            add(e.clientX, e.clientY, "click");
            canvasPosition(e.clientX, e.clientY);
        }
    }

    function setPos(e) {
        if(e) {
            if(e.touches) {
                let touch = e.touches[0];
                currX = Math.floor(touch.clientX);
                currY = Math.floor(touch.clientY);
            }
            else if(e.clientX && e.clientY) {
                currX = e.clientX;
                currY = e.clientY;
            }
        }
    }

    function addHover() {
        add(currX, currY, "hover");
    }

    let colors = ["#23171b","#4860e6","#2aabee","#2ee5ae","#6afd6a","#c0ee3d","#feb927","#fe6e1a","#c2270a","#900c00"];
    function getFillColor(d) {
        let valuePercentile = d.hover / hoverCap;
        let valueAsColorPercentile = Math.min(1, colors.length * valuePercentile);
        let colorIndex = Math.floor(colors.length * valueAsColorPercentile);

        return colors[colorIndex];
    }

    function canvasPosition(x, y) {
        let xScaled = Math.floor(x * (w / document.body.clientWidth));
        let yScaled = Math.floor(y * (h / document.body.clientHeight));

        return [xScaled, yScaled];
    }

    function drawClicks() {
        for(let x=0; x < data.length; x++) {

            let colData = data[x];
            if(colData) {
                for(let y=0; y < colData.length; y++) {
                    let d = data[x][y];
                    
                    if(d) {
                        if(d.click > 0) {
                            let [cX, cY] = canvasPosition(d.x, d.y);

                            ctx.beginPath();
                            ctx.globalAlpha = 1;
                            ctx.fillStyle = "#FF0000";
                            ctx.arc(cX, cY, clickMarkerSize, 0, Math.PI * 2, false);
                            ctx.fill();
                        }
                    }
                }
            }
        }
    }

    function drawHover() {
        ctx.clearRect(0, 0, w, h);
       
        for(let x=0; x < data.length; x++) {
            // Sort data ascending by hover value
            let colData = data[x];

            if(colData) {
                colData = colData.sort((a,b) => a.hover - b.hover);

                for(let y=0; y < colData.length; y++) {
                    let d = colData[y];
                    
                    if(d) {
                        if(d.hover > 0) {
                            let [cX, cY] = canvasPosition(d.x, d.y);

                            ctx.beginPath()
                            ctx.globalAlpha = alpha;
                            ctx.fillStyle = getFillColor(d);
                            ctx.arc(cX, cY, hoverMarkerSize, 0, Math.PI * 2, false);
                            ctx.fill()
                        }
                    }
                }
            }
        }
    }

    function draw() {
        drawHover();
        drawClicks();
    }

    init();
    return {
        addHover,
        setPos,
        addClick,
        draw,
        data,
        canvas,
        init,
        sizeToScreen,
        toggleFullPage,
        isFullPage: _ => isFullPage,
    };
}

function debounced(f, delay) {
    let arg;
    function invoke(f, arg) {
        return f(arg);
    }

    let timeoutId = setTimeout(invoke(f, arg), delay);
    return function(arg) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(invoke(f, arg), delay);
    }
}