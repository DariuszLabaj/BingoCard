const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
let state = LOADING;
let loadingProgress = { value: 0 };
let progressBar;
let sfx = {};
let font;
let materialFont;
let strings;
let bingoCard = new BingoCard();

async function setup() {
    createCanvas(windowWidth, windowHeight);
    document.body.style.touchAction = 'none';
    progressBar = new ProgressBar(width / 2, height / 2, width * 0.6, 30);
    loadDataAsync(loadingProgress);
}

function draw() {
    switch (state) {
        case LOADING:
            drawLoadingScreen();
            break;
        case MAIN:
            bingoCard.draw();
            break;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    switch (state) {
        case LOADING:
            progressBar.resize(width / 2, height / 2, width * 0.6, 30);
            break;
    }
}

function drawLoadingScreen() {
    background(30);
    progressBar.text = "Loading..." + Math.floor(loadingProgress.value * 100) + "%";
    progressBar.draw(loadingProgress.value);
    if (loadingProgress.value >= 1) {
        state = MAIN;
    }
}

async function loadDataAsync(progress) {
    total = 5;
    fulfilled = 0;
    const advance = () => {
        fulfilled++;
        progress.value = fulfilled / total;
    }

    const usedDataPromise = bingoCard.load().then(advance);
    const fontPromise = loadFont("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap").then(f => { font = f; advance(); });
    const internationalizationPromise = loadJSON("assets\\strings.json").then(s => { strings = new ResourceManager(s); advance() });
    const materialFontPromise = loadFont("assets\\MaterialSymbolsOutlined-VariableFont_FILL,GRAD,opsz,wght.ttf").then(f => { materialFont = f; advance(); });
    const sfxPromise = loadSound("assets\\sfx.wav").then(s => { sfx.toggle = s; sfx.toggle.amp(0.25, 0.05); advance(); });

    await Promise.all([usedDataPromise, fontPromise, internationalizationPromise, materialFontPromise, sfxPromise]);
}

function toggleTheme() {
    const current = document.body.className;
    bingoCard.preferences.theme = current === DARK ? LIGHT : DARK;
    bingoCard.save();
    applyTheme(bingoCard.preferences.theme);
}

function mousePressed() {
    if (state === MAIN) {
        bingoCard.touchStarted(mouseX, mouseY)
    }
}

function touchStarted() {
    return false;
}