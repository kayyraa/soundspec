let CanvasWidth = Canvas.width = window.innerWidth;
let CanvasHeight = Canvas.height = window.innerHeight;

let Source = { X: CanvasWidth / 2, Y: CanvasHeight / 2, Size: 4 };
let Particles = [];
let Sensivity = 1;
let Drag = 0.985;
let ParticleCount = IsMobile() ? 2 ** 12 : 2 ** 14 + 2 ** 10;
let ParticleSize = 2;
let IsDragging = false;
let DragOffsetX = 0;
let DragOffsetY = 0;
let IsHovering = false;
let ImpulseFactor = 1;
let SourceFreq = 0;
let SourceVolume = 0;

for (let Index = 0; Index < ParticleCount; Index++) {
    Particles.push({ X: Math.random() * CanvasWidth, Y: Math.random() * CanvasHeight, Vx: 0, Vy: 0 });
}

let AudioCtx = new AudioContext();
let Analyzer = AudioCtx.createAnalyser();
Analyzer.fftSize = 2048;
Analyzer.smoothingTimeConstant = 0.1;
let FreqData = new Uint8Array(Analyzer.frequencyBinCount);
let CurrentSourceNode = null;
let AudioElement = new Audio();
let FileSource = null;

function SetupAnalyzer(SourceNode, PlayToOutput = false) {
    if (CurrentSourceNode) {
        try { CurrentSourceNode.disconnect(); } catch {}
    }
    CurrentSourceNode = SourceNode;
    SourceNode.connect(Analyzer);
    if (PlayToOutput) {
        try { Analyzer.connect(AudioCtx.destination); } catch {}
    } else {
        try { Analyzer.disconnect(AudioCtx.destination); } catch {}
    }
}

function StartMic() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(Stream => {
        let MicSource = AudioCtx.createMediaStreamSource(Stream);
        SetupAnalyzer(MicSource, false);
        MeasureAudio();
    });
}

let SmoothedFreq = 0;
let SmoothedVolume = 0;

function MeasureAudio() {
    Analyzer.getByteFrequencyData(FreqData);
    let MaxIndex = 0;
    let MaxValue = 0;
    let Total = 0;
    for (let _ = 0; _ < FreqData.length; _++) {
        Total += FreqData[_];
        if (FreqData[_] > MaxValue) { MaxValue = FreqData[_]; MaxIndex = _; }
    }
    let RawFreq = MaxIndex * AudioCtx.sampleRate / Analyzer.fftSize;
    SmoothedFreq = SmoothedFreq * 0.8 + RawFreq * 0.2;
    SourceFreq = SmoothedFreq;
    let RawVolume = Total / FreqData.length * Sensivity;
    SmoothedVolume = SmoothedVolume * 0.8 + RawVolume * 0.2;
    SourceVolume = SmoothedVolume;
    requestAnimationFrame(MeasureAudio);
}

const MediaInput = document.querySelector(".MediaInput");
const PlayButton = document.querySelector(".SpanButton.Play");
const StopButton = document.querySelector(".SpanButton.Stop");
const ReconnectButton = document.querySelector(".SpanButton.Reconnect");

MediaInput.addEventListener("input", (Event) => {
    const File = Event.target.files[0];
    if (!File) return;
    const Url = URL.createObjectURL(File);
    AudioElement.src = Url;
    FileSource = AudioCtx.createMediaElementSource(AudioElement);
});

PlayButton.addEventListener("click", async () => {
    await AudioCtx.resume();
    if (FileSource) {
        SetupAnalyzer(FileSource, true);
        AudioElement.play();
    }
});

StopButton.addEventListener("click", () => {
    AudioElement.pause();
    AudioElement.currentTime = 0;
});

ReconnectButton.addEventListener("click", async () => {
    AudioElement.pause();
    AudioElement.currentTime = 0;
    await AudioCtx.resume();
    StartMic();
});

document.querySelector(".SpanButton.ImpulseModeLabel").addEventListener("click", () => ImpulseFactor *= -1);

Canvas.addEventListener("mousemove", (Event) => {
    let Dx = Event.clientX - Source.X;
    let Dy = Event.clientY - Source.Y;
    IsHovering = Dx * Dx + Dy * Dy <= (Source.Size + SourceVolume / 2) ** 2;
    if (IsDragging) { Source.X = Event.clientX - DragOffsetX; Source.Y = Event.clientY - DragOffsetY; }
});

Canvas.addEventListener("mousedown", (Event) => {
    if (IsHovering) { IsDragging = true; DragOffsetX = Event.clientX - Source.X; DragOffsetY = Event.clientY - Source.Y; }
});

Canvas.addEventListener("mouseup", () => IsDragging = false);
Canvas.addEventListener("mouseleave", () => { IsDragging = false; IsHovering = false; });

let LastFrameTime = performance.now();
let Framerate = 0;

const Update = () => {
    let Now = performance.now();
    Framerate = 1000 / (Now - LastFrameTime);
    LastFrameTime = Now;

    ChangeText(".mFreq", `Frequency: ${(SourceFreq / 250).toFixed(1)}kHz`);
    ChangeText(".mVolume", `Volume: ${(SourceVolume / 2).toFixed(1)}dB`);
    ChangeText(".sFrame", `Framerate: ${Math.floor(Framerate)}`);
    ChangeText(".sParts", `Parts: ${Particles.length}`);
    ChangeText(".SpanButton.ImpulseModeLabel", `Impulse: <span style="color: ${ImpulseFactor == -1 ? "rgb(255, 89, 89)" : "rgb(89, 89, 255)"}; font-weight: 600;">${ImpulseFactor == -1 ? "PULL" : "PUSH"}</span>`);

    Ctx.clearRect(0, 0, CanvasWidth, CanvasHeight);

    let ForceList = [];
    for (let Index = 0; Index < Particles.length; Index++) {
        let P = Particles[Index];
        let Dx = P.X - Source.X;
        let Dy = P.Y - Source.Y;
        let Dist = Math.sqrt(Dx * Dx + Dy * Dy) || 1;
        let Angle = Math.atan2(Dy, Dx);
        let Force = Math.min(2, SourceVolume / (Dist * 4)) * ImpulseFactor;
        let CosA = Math.cos(Angle);
        let SinA = Math.sin(Angle);

        ForceList.push(Force);
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

    let TotalForce = ForceList.reduce((A, B) => A + B, 0);
    let AvgForce = ForceList.length > 0 ? TotalForce / ForceList.length : 0;
    ChangeText(".ForceLabel", `Impulse Force: ${Math.abs(AvgForce).toFixed(2)}`);

    let SourceRadius = Math.min(128, SourceVolume); 
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

    requestAnimationFrame(Update);
};

window.addEventListener("resize", () => {
    CanvasWidth = Canvas.width = window.innerWidth;
    CanvasHeight = Canvas.height = window.innerHeight;
    Source.X = CanvasWidth / 2;
    Source.Y = CanvasHeight / 2;
});

window.addEventListener("click", async () => { await AudioCtx.resume(); StartMic(); }, { once: true });

document.addEventListener("DOMContentLoaded", Update);
