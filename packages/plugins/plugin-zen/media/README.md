# Record Mirrored iPhone Audio on Mac (BlackHole + QuickTime)

Connect iPhone to Mac via screen mirroring.

## 1. Confirm audio reaches Mac
Play audio from the mirrored iPhone.

Check:
- Do you hear it through **Mac speakers**?

If no → mirroring audio is not reaching the Mac.

---

## 2. Route Mac audio to BlackHole

Open: System Settings → Sound → Output
Select: BlackHole 2ch

Play audio again.

Expected:
- You **hear nothing** (audio is routed into BlackHole).

---

## 3. Verify signal

Open: Applications → Utilities → Audio MIDI Setup
Select: BlackHole 2ch

Play audio and check:

- **Input meters should move**

If meters do not move → audio is not routed into BlackHole.

---

## 4. Record

Open **QuickTime Player**

File → New Audio Recording

Next to the record button choose:

Microphone: BlackHole 2ch

Press **Record**.

Play the mirrored audio.

Expected:
- QuickTime input meter moves
- Audio is recorded

---

## Signal Flow

iPhone → screen mirror → Mac  
Mac audio output → BlackHole  
BlackHole → QuickTime recording
