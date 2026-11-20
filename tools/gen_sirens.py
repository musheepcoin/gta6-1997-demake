"""
Procedural emergency-vehicle sound generator (original synthesis, no sampled game audio).
Generates 44.1 kHz 16-bit mono WAVs that loop seamlessly:
  siren_police.wav     - US electromechanical rotation: wail -> yelp -> phaser (T3-style) cycle
  siren_medic.wav      - EU hi-lo two-tone bursts followed by a slow wail
  siren_firetruck.wav  - Q-siren whoop sweeps + periodic dual-chime air horn blasts + diesel rumble
  horn_airhorn.wav     - dual-trumpet air horn (emergency honk)
Run:  python tools/gen_sirens.py
"""
import wave
import numpy as np
import os

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sfx", "vehicles")
rng = np.random.default_rng(26)


def write_wav(name, x, peak=0.82):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    pcm = (x * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"{name}: {len(x) / SR:.2f}s")


def make_loop(x, xfade=0.06):
    """Cross-fade tail into head so the loop point is click-free."""
    n = int(xfade * SR)
    head = x[:n] * np.linspace(0, 1, n)
    tail = x[-n:] * np.linspace(1, 0, n)
    y = x[:-n].copy()
    y[:n] = y[:n] * np.linspace(0, 1, n) + tail  # blend tail under the head
    y[:n] = head + tail
    return y


def freq_to_wave(freq, harmonics, drive=2.2, vibrato=0.0):
    """Phase-continuous additive tone from an instantaneous-frequency curve."""
    if vibrato:
        t = np.arange(len(freq)) / SR
        freq = freq * (1 + vibrato * np.sin(2 * np.pi * 5.2 * t))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    y = np.zeros_like(freq)
    for k, amp in harmonics:
        y += amp * np.sin(k * phase)
    return np.tanh(drive * y)  # soft clip = driven horn-driver grit


def one_pole_lp(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def bandlimit(x, lo=380, hi=4800):
    # horn-speaker response: cheap band-pass from two one-pole filters
    lp = one_pole_lp(x, hi)
    return lp - one_pole_lp(lp, lo)


def slapback(x, delays=((0.085, 0.30), (0.17, 0.18), (0.31, 0.10))):
    """Street/building echo so sirens sit in a city instead of a dry studio."""
    y = x.copy()
    for d, g in delays:
        n = int(d * SR)
        y[n:] += x[:-n] * g
        y[:n] += x[-n:] * g  # wrap-around keeps the loop seamless
    return y


SIREN_HARM = [(1, 1.0), (2, 0.55), (3, 0.42), (4, 0.22), (5, 0.16), (7, 0.08)]


def sweep(lo, hi, dur, shape="tri", power=1.0):
    n = int(dur * SR)
    t = np.linspace(0, 1, n, endpoint=False)
    if shape == "tri":
        s = 1 - np.abs(2 * t - 1)
    elif shape == "saw":
        s = t
    else:
        s = 0.5 - 0.5 * np.cos(2 * np.pi * t)
    s = s ** power
    return lo * (hi / lo) ** s  # exponential (musical) sweep


def two_tone(f1, f2, dur_each, reps, glide=0.035):
    seq = []
    for r in range(reps):
        for f in (f1, f2):
            seq.append(np.full(int(dur_each * SR), float(f)))
    x = np.concatenate(seq)
    k = max(1, int(glide * SR))
    return np.convolve(x, np.ones(k) / k, mode="same")


def police():
    wail = np.concatenate([sweep(640, 1450, 3.4, "cos") for _ in range(2)])
    yelp = np.concatenate([sweep(650, 1500, 0.22, "cos") for _ in range(14)])
    phaser = np.concatenate([sweep(900, 1400, 0.11, "saw") for _ in range(24)])
    hilo = two_tone(690, 910, 0.42, 4)
    f = np.concatenate([wail, yelp, hilo, phaser, wail[: int(1.7 * SR)]])
    y = freq_to_wave(f, SIREN_HARM, drive=2.4, vibrato=0.004)
    y = bandlimit(y)
    y = slapback(y)
    return make_loop(y)


def medic():
    hilo = two_tone(650, 860, 0.52, 9)
    wail = np.concatenate([sweep(560, 1250, 2.9, "cos") for _ in range(2)])
    yelp = np.concatenate([sweep(600, 1300, 0.26, "cos") for _ in range(9)])
    f = np.concatenate([hilo, wail, yelp])
    y = freq_to_wave(f, [(1, 1.0), (2, 0.40), (3, 0.30), (5, 0.10)], drive=1.9, vibrato=0.003)
    y = bandlimit(y, 330, 4200)
    y = slapback(y)
    return make_loop(y)


def airhorn_burst(dur, f1=392.0, f2=494.0, attack=0.035, release=0.12):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for f, g in ((f1, 1.0), (f2, 0.9), (f1 * 2.005, 0.35), (f2 * 1.998, 0.3), (f1 * 3.01, 0.15)):
        # slight pitch scoop at the start like a real compressed-air diaphragm horn
        scoop = 1 - 0.035 * np.exp(-t / 0.05)
        y += g * np.sin(2 * np.pi * np.cumsum(f * scoop) / SR)
    y = np.tanh(1.6 * y)
    env = np.ones(n)
    a = int(attack * SR)
    r = int(release * SR)
    env[:a] = np.linspace(0, 1, a) ** 1.4
    env[-r:] = np.linspace(1, 0, r) ** 1.5
    y *= env
    y += 0.10 * env * rng.standard_normal(n) * 0.2  # air hiss
    return y


def firetruck():
    sig = np.concatenate([sweep(420, 1500, 0.30, "saw", 0.8) for _ in range(30)])  # Q-siren whoops ~9 s
    q = freq_to_wave(sig, [(1, 1.0), (2, 0.5), (3, 0.35), (4, 0.2)], drive=2.0)
    q = bandlimit(q, 300, 3800)
    total = len(q)
    mix = q * 0.75
    # air horn blasts on top (two long, one short) - rhythm like a real engine company approaching an intersection
    for start, dur in ((1.2, 1.3), (3.6, 0.7), (4.5, 0.7), (6.3, 1.5)):
        b = airhorn_burst(dur)
        i = int(start * SR)
        mix[i : i + len(b)] += b * 1.0
    # diesel idle rumble (firing frequency ~ 28 Hz with harmonics) under everything
    t = np.arange(total) / SR
    rumble = sum(np.sin(2 * np.pi * f * t + p) * g for f, g, p in ((28, 0.6, 0), (56, 0.35, 1.1), (84, 0.2, 2.3), (112, 0.1, 0.4)))
    rumble *= 0.10 * (1 + 0.25 * np.sin(2 * np.pi * 7 * t))
    mix += rumble
    mix = slapback(mix)
    return make_loop(mix)


def airhorn_one():
    y = airhorn_burst(0.95, release=0.18)
    y = slapback(np.concatenate([y, np.zeros(int(0.5 * SR))]), delays=((0.08, 0.2), (0.16, 0.1)))
    return y


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    write_wav("siren_police.wav", police())
    write_wav("siren_medic.wav", medic())
    write_wav("siren_firetruck.wav", firetruck(), peak=0.88)
    write_wav("horn_airhorn.wav", airhorn_one(), peak=0.9)
