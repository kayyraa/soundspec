let CanvasWidth = Canvas.width = window.innerWidth;
let CanvasHeight = Canvas.height = window.innerHeight;

let Source = { X: CanvasWidth / 2, Y: CanvasHeight / 2, Size: 4 };
let Particles = [];
let Sensitivity = 1;
let SourceVolume = 0;
let FrequencyFactor = 2;
let Drag = 0.975;
let ParticleCount = IsMobile() ? 2 ** 12 : 2 ** 14;
let ParticleSize = 2;
let IsDragging = false;
let DragOffsetX = 0;
let DragOffsetY = 0;
let IsHovering = false;

for (let Index = 0; Index < ParticleCount; Index++) { Particles.push({ X: Math.random() * CanvasWidth, Y: Math.random() * CanvasHeight, Vx: 0, Vy: 0 }); }

navigator.mediaDevices.getUserMedia({ audio: true }).then(Stream => {
    const AudioCtx = new AudioContext();
    const SourceNode = AudioCtx.createMediaStreamSource(Stream);
    const Analyzer = AudioCtx.createAnalyser();
    const FreqData = new Uint8Array(Analyzer.frequencyBinCount);
    SourceNode.connect(Analyzer);

    const MeasureAudio = () => {
        Analyzer.getByteFrequencyData(FreqData);
        let Total = 0, Weighted = 0;
        for (let Index = 0; Index < FreqData.length; Index++) {
            Total += FreqData[Index];
            Weighted += FreqData[Index] * Index;
        }
        SourceVolume = (Total / FreqData.length) * Sensitivity;
        FrequencyFactor = Weighted / (Total * FreqData.length) || 0;
        requestAnimationFrame(MeasureAudio);
    };

    MeasureAudio();
});

Canvas.addEventListener("mousemove", (e) => {
    let Dx = e.clientX - Source.X;
    let Dy = e.clientY - Source.Y;
    IsHovering = Dx * Dx + Dy * Dy <= (Source.Size + SourceVolume) ** 2;
    if (IsDragging) { Source.X = e.clientX - DragOffsetX; Source.Y = e.clientY - DragOffsetY; }
});

Canvas.addEventListener("mousedown", (e) => {
    if (IsHovering) { IsDragging = true; DragOffsetX = e.clientX - Source.X; DragOffsetY = e.clientY - Source.Y; }
});
Canvas.addEventListener("mouseup", () => IsDragging = false);
Canvas.addEventListener("mouseleave", () => { IsDragging = false; IsHovering = false; });

let LastFrameTime = performance.now();
let Framerate = 0;
let SourceFreq = 0;

const Update = () => {
    let Now = performance.now();
    Framerate = 1000 / (Now - LastFrameTime);
    LastFrameTime = Now;

    SourceFreq = FrequencyFactor * 20000;

    ChangeText(".mVolume", `Volume: ${Math.floor(SourceVolume)}dB`);
    ChangeText(".mFreq", `Frequency: ${(SourceFreq / 1000).toFixed(1)}kHz`);
    ChangeText(".sFrame", `Framerate: ${Math.floor(Framerate)}`);
    ChangeText(".sParts", `Parts: ${Particles.length}`);

    Ctx.clearRect(0, 0, CanvasWidth, CanvasHeight);

    let SourceRadius = Math.min(128, Source.Size + SourceVolume);
    Ctx.fillStyle = "white";
    Ctx.beginPath();
    Ctx.arc(Source.X, Source.Y, SourceRadius, 0, Math.PI * 2);
    Ctx.fill();

    if (IsHovering) {
        Ctx.strokeStyle = "rgba(255,255,255,0.25)";
        Ctx.lineWidth = 2;
        Ctx.setLineDash([4, 4]);
        Ctx.beginPath();
        Ctx.arc(Source.X, Source.Y, SourceRadius + 8, 0, Math.PI * 2);
        Ctx.stroke();
        Ctx.setLineDash([]);
    }

    let SV = SourceVolume * 0.0625;
    for (let Index = 0; Index < Particles.length; Index++) {
        let P = Particles[Index];
        let Dx = P.X - Source.X;
        let Dy = P.Y - Source.Y;
        let Dist = Math.sqrt(Dx * Dx + Dy * Dy) || 1;
        let Angle = Math.atan2(Dy, Dx);

        let OutwardForce = Math.min(2, SV / (Dist * 0.03125));
        let WavePhase = Dist * 0.0625 - FrequencyFactor * 128;
        let WaveForce = Math.sin(WavePhase) * SourceVolume * 0.0125;

        let Force = OutwardForce + WaveForce;
        let CosA = Math.cos(Angle);
        let SinA = Math.sin(Angle);

        P.Vx += CosA * Force;
        P.Vy += SinA * Force;

        P.X = (P.X + P.Vx + CanvasWidth) % CanvasWidth;
        P.Y = (P.Y + P.Vy + CanvasHeight) % CanvasHeight;

        P.Vx *= Drag;
        P.Vy *= Drag;

        let Speed = P.Vx * P.Vx + P.Vy * P.Vy;
        let Red = Math.min(255, Math.floor(Speed * 16));
        Ctx.fillStyle = `rgb(${Red},0,${255 - Red})`;
        Ctx.fillRect(P.X, P.Y, ParticleSize, ParticleSize);
    }

    requestAnimationFrame(Update);
};

window.addEventListener("resize", () => {
    CanvasWidth = Canvas.width = window.innerWidth;
    CanvasHeight = Canvas.height = window.innerHeight;
    Source.X = CanvasWidth / 2;
    Source.Y = CanvasHeight / 2;
});

document.addEventListener("DOMContentLoaded", Update);