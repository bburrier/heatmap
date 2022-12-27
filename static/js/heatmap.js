function Heatmap(canvasId, config) {

    let canvas = document.getElementById(canvasId);
    let ctx = canvas.getContext('2d');
    let isFullPage = false;
    let colors = ["#355f8d","#4a58dd","#2f9df5","#27d7c4","#4df884","#95fb51","#dedd32","#ffa423","#f65f18","#ba2208","#900c00"];
    let mobileBreakpoint = 650;
    let maxHoverMarkerSize = 30;
    
    let desktopSize = config.desktopSize;
    let mobileSize = config.mobileSize;
    let hoverMarkerSize, clickMarkerSize;
    let alpha = config.alpha ? config.alpha : getAlpha();

    let currX, currY;
    let data;

    function init() {
        resetData();

        // Set canvas size
        sizeToScreen(canvas);
        window.addEventListener('resize', onResize);
        
        // Register event listeners
        document.addEventListener('mousemove', setPos);
        document.addEventListener('mousedown', debounced(addClick, 50));
        document.addEventListener('mouseup', debounced(addClick, 50));
        document.addEventListener('touchstart', setPos);
        document.addEventListener('touchmove', setPos);

        setInterval(addHover, 5);
        setInterval(draw, 100);
    }

    function resetData() {
        // Initialize 2d array (map) of 
        // size scrollWidth x scrollHeight
        data = new Array(document.body.scrollWidth);
        for(let i = 0; i < data.length; i++) {
            data[i] = new Array(document.body.scrollHeight);
        }
    }

    function onResize() {
        resetData();
        sizeToScreen();
    }

    function getHoverCap() {
        // TODO: Defined as a function because this 
        // may be a calculated value in the future
        return 160;
    }

    function getAlpha() {
        // TODO: Defined as a function because this 
        // may be a calculated value in the future
        return 0.01;
    }

    function sizeToScreen() {
        isFullPage = false;
        canvas.classList.remove("fullpage")

        if(document.body.clientWidth < mobileBreakpoint) {
            canvas.width = mobileSize;
            canvas.height = mobileSize;
            clickMarkerSize = canvas.width / 50;
            hoverMarkerSize = canvas.width / 15;
        }
        else {
            canvas.width = desktopSize;
            canvas.height = desktopSize;
            clickMarkerSize = canvas.width / 50;
            hoverMarkerSize = Math.min(canvas.width / 18, maxHoverMarkerSize);
        }
    }

    function toggleFullPage(w, h) {
        if(isFullPage) {
            isFullPage = false;
            sizeToScreen(canvas);
            canvas.classList.remove("fullpage")
            alpha = getAlpha();
        }

        else {
            isFullPage = true;

            canvas.width = document.body.scrollWidth;
            canvas.height = document.body.scrollHeight;

            if(document.body.clientWidth < mobileBreakpoint) {
                clickMarkerSize = 5;
                hoverMarkerSize = canvas.width / 20;
            }
            else {
                clickMarkerSize = 5;
                hoverMarkerSize = Math.min(canvas.width / 35, maxHoverMarkerSize);
            }

            canvas.classList.add("fullpage")
        }
    }

    function add(x, y, event) {
        // Make sure row exists
        data[x] = data[x] ? data[x] : new Array(document.body.clientWidth);

        // Upsert point data
        let current = data[x][y];
        if(current) {
            let currValue = data[x][y][event];
            data[x][y][event] = Math.min(currValue + 1, getHoverCap());
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
            add(e.pageX, e.pageY, "click");
        }
    }

    function setPos(e) {
        if(e) {
            if(e.touches) {
                let touch = e.touches[0];
                currX = Math.floor(touch.pageX);
                currY = Math.floor(touch.pageY);
            }
            else if(e.clientX && e.clientY) {
                currX = e.pageX;
                currY = e.pageY;
            }
        }
    }

    function addHover() {
        add(currX, currY, "hover");
    }
    
    function getValuePercentile(value) {
        return value / getHoverCap();
    }
    
    function getColorPercentile(valuePercentile) {
        return Math.min(1, colors.length * valuePercentile);
    }

    function getFillColor(d) {
        let valuePercentile = getValuePercentile(d.hover);
        let valueAsColorPercentile = getColorPercentile(valuePercentile);
        let colorIndex = Math.floor(colors.length * valueAsColorPercentile);

        return colors[colorIndex];
    }

    function canvasPosition(x, y) {
        let xScaled = Math.floor(x * (canvas.width / document.body.scrollWidth));
        let yScaled = Math.floor(y * (canvas.height / document.body.scrollHeight));

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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
       
        for(let x=0; x < data.length; x++) {
            let colData = data[x];

            if(colData) {
                // Sort data ascending by hover weight
                colData = colData.sort((a,b) => a.hover - b.hover);

                for(let y=0; y < colData.length; y++) {
                    let d = colData[y];
                    
                    if(d) {
                        if(d.hover > 0) {
                            let [cX, cY] = canvasPosition(d.x, d.y);
                            
                            ctx.beginPath()
                            ctx.globalAlpha = getAlpha();
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
        getValuePercentile,
        getColorPercentile,
        getFillColor,
        getHoverCap,
        colors,
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