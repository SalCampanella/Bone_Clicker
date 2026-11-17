const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
canvas.width = 900;
canvas.height = 600;

let count = 0;
let clickPower = 1;
let bps = 0;
let lastTime = performance.now();

const upgrades = [
    { name: 'Stronger Shovel', baseCost: 25,       type: 'click', amount: 1,     owned: 0 },
    { name: 'Bone Digger',     baseCost: 50,       type: 'auto',  amount: 0.2,   owned: 0 },
    { name: 'Fossil Hunter',   baseCost: 500,      type: 'auto',  amount: 1.5,   owned: 0 },
    { name: 'Anthropologist',  baseCost: 3000,     type: 'auto',  amount: 8,     owned: 0 },
    { name: 'Archaeologist',   baseCost: 20000,    type: 'auto',  amount: 45,    owned: 0 },
    { name: 'Paleontologist',  baseCost: 150000,   type: 'auto',  amount: 280,   owned: 0 },
    { name: 'Dinosaur Expert', baseCost: 1500000,  type: 'auto',  amount: 2500,  owned: 0 },
    { name: 'Jurassic Park',   baseCost: 20000000, type: 'auto',  amount: 30000, owned: 0 },
];

function formatNumber(num) {
    if (num < 1000) return num.toString();
    const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
    let unitIndex = -1;
    while (num >= 1000 && unitIndex < units.length - 1) {
        num /= 1000;
        unitIndex++;
    }
    return num.toFixed(2) + units[unitIndex];
}

//t-rex
const tRexImage = new Image();
tRexImage.src = 'Sprites/t_rex.png';

class tRex {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.width = 400;
        this.height = this.width * 573 / 749; // keep the image's proportions
        this.scale = 1;
        this.shrinkScale = 0.85;
        this.shrinkDuration = 150; // ms
        this.clickTime = -Infinity;
    }
    press() {
        this.clickTime = performance.now();
    }
    isClicked(x, y) {
        return Math.abs(x - this.x) <= this.width / 2 &&
            Math.abs(y - this.y) <= this.height / 2;
    }
    update() {
        // shrink instantly on click, then ease back to full size
        const progress = Math.min((performance.now() - this.clickTime) / this.shrinkDuration, 1);
        this.scale = this.shrinkScale + (1 - this.shrinkScale) * progress;
    }
    draw() {
        if (!tRexImage.complete) return;
        const w = this.width * this.scale;
        const h = this.height * this.scale;
        ctx.drawImage(tRexImage, this.x - w / 2, this.y - h / 2, w, h);
    }
}
const myTRex = new tRex();

function costAt(u, k) { return Math.floor(u.baseCost * Math.pow(1.35, u.owned + k)); }

// total price for n copies
function bulkCost(u, n) {
    let total = 0;
    for (let k = 0; k < n; k++) total += costAt(u, k);
    return total;
}

// how many copies you can afford right now
function maxAffordable(u) {
    let n = 0, total = 0;
    while (n < 1000 && total + costAt(u, n) <= count) {
        total += costAt(u, n);
        n++;
    }
    return n;
}

// turns the selected mode into a number for this upgrade
function amountFor(u) {
    return buyAmount === 'max' ? maxAffordable(u) : buyAmount;
}

function buyMany(u) {
    const n = amountFor(u);
    if (n < 1) return;
    const total = bulkCost(u, n);
    if (count >= total) {
        count -= total;
        u.owned += n;
        recalc();
    }
}

function recalc() {
    clickPower = 1;
    bps = 0;
    upgrades.forEach(function (u) {
        if (u.type === 'click') clickPower += u.amount * u.owned;
        else bps += u.amount * u.owned;
    });
}

const shop = { x: 700, y: 140, width: 190, height: 70, gap: 10, viewHeight: 450 };

function upgradeRect(i) {
    return {
        x: shop.x,
        y: shop.y + i * (shop.height + shop.gap) - shopScroll,
        w: shop.width,
        h: shop.height
    };
}

let buyAmount = 1;                  // 1, 10, 50, or 'max'
const BUY_MODES = [1, 10, 50, 'max'];
const selector = { y: 100, h: 30, gap: 6 };

function selectorRect(i) {
    const w = (shop.width - selector.gap * (BUY_MODES.length - 1)) / BUY_MODES.length;
    return { x: shop.x + i * (w + selector.gap), y: selector.y, w: w, h: selector.h };
}

function drawSelector() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    BUY_MODES.forEach(function (mode, i) {
        const r = selectorRect(i);
        const active = mode === buyAmount;

        ctx.fillStyle = active ? '#4caf50' : '#e0e0e0';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = active ? 3 : 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        ctx.fillStyle = 'black';
        ctx.font = '13px Orbitron, sans-serif';
        ctx.fillText(mode === 'max' ? 'MAX' : 'x' + mode, r.x + r.w / 2, r.y + r.h / 2);
    });
    ctx.textBaseline = 'alphabetic'; // reset so your other text isn't shifted
}

function drawShop() {
    drawSelector();

    ctx.save();
    ctx.beginPath();
    ctx.rect(shop.x, shop.y, shop.width, shop.viewHeight);
    ctx.clip();

    ctx.textAlign = 'left';
    upgrades.forEach(function (u, i) {
        const r = upgradeRect(i);
        const n = Math.max(1, amountFor(u));   // in MAX mode with nothing affordable, show the price of 1
        const price = bulkCost(u, n);
        const affordable = count >= price;


        // button (green if you can afford it, gray if not)
        ctx.fillStyle = affordable ? '#8bc34a' : '#cccccc';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        // text
        ctx.fillStyle = 'black';
        ctx.font = '16px Orbitron, sans-serif';
        ctx.fillText(u.name, r.x + 10, r.y + 24);
        ctx.font = '13px Orbitron, sans-serif';
        const qty = buyAmount === 'max' && affordable ? ' (x' + n + ')' : '';
        ctx.fillText('Cost: ' + formatNumber(price) + qty, r.x + 10, r.y + 44);
        const effect = u.type === 'click' ? '+' + u.amount + '/click' : '+' + u.amount + '/s';
        ctx.fillText('Owned: ' + u.owned + '  (' + effect + ')', r.x + 10, r.y + 62);
    });
    ctx.textAlign = 'center'; // reset for the other text
    ctx.restore();
}

let shopScroll = 0;

function maxScroll() {
    const content = upgrades.length * (shop.height + shop.gap) - shop.gap;
    return Math.max(0, content - shop.viewHeight);
}

function inShop(x, y) {
    return x >= shop.x && x <= shop.x + shop.width &&
        y >= shop.y && y <= shop.y + shop.viewHeight;
}

canvas.addEventListener('wheel', function (e) {
    const rect = canvas.getBoundingClientRect();
    if (!inShop(e.clientX - rect.left, e.clientY - rect.top)) return;
    e.preventDefault(); // stop the page from scrolling too
    shopScroll = Math.min(maxScroll(), Math.max(0, shopScroll + e.deltaY));
}, { passive: false });

const floatingMessages = [];
class floatingMessage {
    constructor(clickpower, x, y, size) {
        this.clickpower = clickpower;
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = 'white';
        this.opacity = 1;
        this.lifeSpan = 0;
    }
    update() {
        this.y -= 0.3;
        this.lifeSpan += 1;
        if (this.opacity > 0.03) this.opacity -= 0.03;
    }
    draw() {
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.font = this.size + "px Orbitron";
        ctx.fillText("+" + formatNumber(this.clickpower), this.x, this.y);
        ctx.globalAlpha = 1;
    }
}
function handleFloatingMessages() {
    for (let i = 0; i < floatingMessages.length; i++) {
        floatingMessages[i].update();
        floatingMessages[i].draw();
        if (floatingMessages[i].lifeSpan >= 50) {
            floatingMessages.splice(i, 1);
            i--;
        }
    }
}

class boost {
    constructor(current) {
        this.x = canvas.width / 12;
        this.y = canvas.height / 5;
        this.width = 20;
        this.height = 400;
        this.max = 50;
        this.current = current;
        this.xtwo = 30;
        this.xthree = 45;
        this.rate = 1.35;
    }
    getmultiplier() {
        if (this.current >= this.xthree) return 3;
        if (this.current >= this.xtwo) return 2;
        return 1;
    }
    update(dt) {
        if (this.current > 1) this.current -= this.rate * dt;
    }
    draw() {
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.fillStyle = 'gold';
        ctx.font = '25px Orbitron, sans-serif';
        const bottom = this.y + this.height - 2.5;
        const usable = this.height - 5;
        ctx.fillText('x2', this.x - 25, bottom - (this.xtwo / this.max) * usable);
        ctx.fillText('x3', this.x - 25, bottom - (this.xthree / this.max) * usable);

        if (this.current >= this.xthree) ctx.fillStyle = 'red';
        else if (this.current >= this.xtwo) ctx.fillStyle = 'orange';
        else ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 2.5, this.y + this.height - 2.5, this.width - 5, -(this.current / this.max) * (this.height - 5));
    }
}
const myBoost = new boost(1);

canvas.addEventListener('click', function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // buy-amount selector
    for (let i = 0; i < BUY_MODES.length; i++) {
        const r = selectorRect(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
            buyAmount = BUY_MODES[i];
            return;
        }
    }

    // shop list: clicks in this area never count as T-Rex clicks
    if (inShop(x, y)) {
        for (let i = 0; i < upgrades.length; i++) {
            const r = upgradeRect(i);
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                buyMany(upgrades[i]);
                break;
            }
        }
        return;
    }

    // t-rex
    if (myTRex.isClicked(x, y)) {
        const amount = clickPower * myBoost.getmultiplier();
        count += amount;
        floatingMessages.push(new floatingMessage(amount, myTRex.x, myTRex.y - 80, 40));
        myTRex.press();
        if (myBoost.current < myBoost.max) {
            myBoost.current += 1;
        }
    }
});

function animate() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    count += bps * dt;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    myTRex.update();
    myTRex.draw();

    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.font = '40px Orbitron, sans-serif';
    ctx.fillText('Bones: ' + formatNumber(Math.floor(count)), canvas.width / 2, 60);

    ctx.font = '25px Orbitron, sans-serif';
    ctx.fillText('per click: ' + formatNumber(clickPower) + '   per second: ' + formatNumber(bps.toFixed(1)), canvas.width / 2, 90);
    drawShop();
    handleFloatingMessages();

    myBoost.draw();
    myBoost.update(dt);

    requestAnimationFrame(animate);
}
animate();