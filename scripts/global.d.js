globalThis.Dashboard = document.querySelector(".Dashboard");
globalThis.Canvas = document.querySelector(".Canvas");
globalThis.Ctx = Canvas.getContext("2d");

globalThis.Random = class {
    NextInteger(Min = 0, Max = 0){ if (Min > Max) [Min, Max] = [Max, Min]; return Math.floor(Math.random() * (Max - Min + 1)) + Min }
    NextNumber(Min = 0, Max = 0){ if (Min > Max) [Min, Max] = [Max, Min]; return Math.random() * (Max - Min) + Min }
}

globalThis.Particle = class {
    constructor(PosX = 0, PosY = 0){
        this.X = PosX;
        this.Y = PosY;
        this.Vx = 0;
        this.Vy = 0;
    }
}

globalThis.ChangeText = (Query = "", Text = "") => {
    if (!document.querySelector(Query)) return;
    document.querySelector(Query).innerHTML = Text;
};