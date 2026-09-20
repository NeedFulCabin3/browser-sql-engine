// a stripped down Z80-ish CPU core, close enough to Game Boy's LR35902 for basic ROMs
// not cycle accurate, not trying to be. just enough opcodes to move data around and branch

class CPU {
  constructor() {
    this.mem = new Uint8Array(0x10000);
    this.reset();
  }

  reset() {
    this.a = 0x01; this.f = 0xB0;
    this.b = 0x00; this.c = 0x13;
    this.d = 0x00; this.e = 0xD8;
    this.h = 0x01; this.l = 0x4D;
    this.sp = 0xFFFE;
    this.pc = 0x0100;
    this.halted = false;
  }

  loadRom(bytes) {
    for (let i = 0; i < bytes.length && i < this.mem.length; i++) {
      this.mem[i] = bytes[i];
    }
  }

  // flag helpers, f register bits: Z N H C in top nibble
  getFlag(bit) { return (this.f >> bit) & 1; }
  setFlag(bit, val) {
    if (val) this.f |= (1 << bit);
    else this.f &= ~(1 << bit);
  }
  get flagZ() { return this.getFlag(7); }
  set flagZ(v) { this.setFlag(7, v); }
  get flagN() { return this.getFlag(6); }
  set flagN(v) { this.setFlag(6, v); }
  get flagH() { return this.getFlag(5); }
  set flagH(v) { this.setFlag(5, v); }
  get flagC() { return this.getFlag(4); }
  set flagC(v) { this.setFlag(4, v); }

  get hl() { return (this.h << 8) | this.l; }
  set hl(v) { this.h = (v >> 8) & 0xFF; this.l = v & 0xFF; }
  get bc() { return (this.b << 8) | this.c; }
  set bc(v) { this.b = (v >> 8) & 0xFF; this.c = v & 0xFF; }
  get de() { return (this.d << 8) | this.e; }
  set de(v) { this.d = (v >> 8) & 0xFF; this.e = v & 0xFF; }

  readByte(addr) { return this.mem[addr & 0xFFFF]; }
  writeByte(addr, val) { this.mem[addr & 0xFFFF] = val & 0xFF; }

  fetch8() {
    const v = this.readByte(this.pc);
    this.pc = (this.pc + 1) & 0xFFFF;
    return v;
  }

  fetch16() {
    const lo = this.fetch8();
    const hi = this.fetch8();
    return (hi << 8) | lo;
  }

  inc8(val) {
    const result = (val + 1) & 0xFF;
    this.flagZ = result === 0 ? 1 : 0;
    this.flagN = 0;
    this.flagH = ((val & 0xF) + 1 > 0xF) ? 1 : 0;
    return result;
  }

  dec8(val) {
    const result = (val - 1) & 0xFF;
    this.flagZ = result === 0 ? 1 : 0;
    this.flagN = 1;
    this.flagH = ((val & 0xF) === 0) ? 1 : 0;
    return result;
  }

  addA(val) {
    const result = this.a + val;
    this.flagH = ((this.a & 0xF) + (val & 0xF) > 0xF) ? 1 : 0;
    this.flagC = result > 0xFF ? 1 : 0;
    this.a = result & 0xFF;
    this.flagZ = this.a === 0 ? 1 : 0;
    this.flagN = 0;
  }

  // executes one instruction, returns a short label of what it did (mostly for the log panel)
  step() {
    if (this.halted) return 'HALT';

    const opcode = this.fetch8();

    switch (opcode) {
      case 0x00: return 'NOP';

      case 0x01: this.bc = this.fetch16(); return 'LD BC,d16';
      case 0x11: this.de = this.fetch16(); return 'LD DE,d16';
      case 0x21: this.hl = this.fetch16(); return 'LD HL,d16';
      case 0x31: this.sp = this.fetch16(); return 'LD SP,d16';

      case 0x3E: this.a = this.fetch8(); return 'LD A,d8';
      case 0x06: this.b = this.fetch8(); return 'LD B,d8';
      case 0x0E: this.c = this.fetch8(); return 'LD C,d8';
      case 0x16: this.d = this.fetch8(); return 'LD D,d8';
      case 0x1E: this.e = this.fetch8(); return 'LD E,d8';
      case 0x26: this.h = this.fetch8(); return 'LD H,d8';
      case 0x2E: this.l = this.fetch8(); return 'LD L,d8';

      case 0x02: this.writeByte(this.bc, this.a); return 'LD (BC),A';
      case 0x12: this.writeByte(this.de, this.a); return 'LD (DE),A';
      case 0x22: this.writeByte(this.hl, this.a); this.hl = (this.hl + 1) & 0xFFFF; return 'LD (HL+),A';
      case 0x32: this.writeByte(this.hl, this.a); this.hl = (this.hl - 1) & 0xFFFF; return 'LD (HL-),A';
      case 0x77: this.writeByte(this.hl, this.a); return 'LD (HL),A';

      case 0x0A: this.a = this.readByte(this.bc); return 'LD A,(BC)';
      case 0x1A: this.a = this.readByte(this.de); return 'LD A,(DE)';
      case 0x7E: this.a = this.readByte(this.hl); return 'LD A,(HL)';

      case 0x3C: this.a = this.inc8(this.a); return 'INC A';
      case 0x04: this.b = this.inc8(this.b); return 'INC B';
      case 0x0C: this.c = this.inc8(this.c); return 'INC C';
      case 0x14: this.d = this.inc8(this.d); return 'INC D';
      case 0x1C: this.e = this.inc8(this.e); return 'INC E';
      case 0x24: this.h = this.inc8(this.h); return 'INC H';
      case 0x2C: this.l = this.inc8(this.l); return 'INC L';

      case 0x3D: this.a = this.dec8(this.a); return 'DEC A';
      case 0x05: this.b = this.dec8(this.b); return 'DEC B';
      case 0x0D: this.c = this.dec8(this.c); return 'DEC C';
      case 0x15: this.d = this.dec8(this.d); return 'DEC D';
      case 0x1D: this.e = this.dec8(this.e); return 'DEC E';

      case 0x03: this.bc = (this.bc + 1) & 0xFFFF; return 'INC BC';
      case 0x13: this.de = (this.de + 1) & 0xFFFF; return 'INC DE';
      case 0x23: this.hl = (this.hl + 1) & 0xFFFF; return 'INC HL';

      case 0x80: this.addA(this.b); return 'ADD A,B';
      case 0x81: this.addA(this.c); return 'ADD A,C';
      case 0x86: this.addA(this.readByte(this.hl)); return 'ADD A,(HL)';
      case 0xC6: this.addA(this.fetch8()); return 'ADD A,d8';

      case 0xA8: this.a ^= this.b; this.flagZ = this.a === 0 ? 1 : 0; this.flagN = 0; this.flagH = 0; this.flagC = 0; return 'XOR B';
      case 0xAF: this.a = 0; this.flagZ = 1; this.flagN = 0; this.flagH = 0; this.flagC = 0; return 'XOR A';

      case 0xC3: this.pc = this.fetch16(); return 'JP a16';
      case 0x18: {
        const off = toSigned8(this.fetch8());
        this.pc = (this.pc + off) & 0xFFFF;
        return 'JR r8';
      }
      case 0x20: { // JR NZ
        const off = toSigned8(this.fetch8());
        if (!this.flagZ) this.pc = (this.pc + off) & 0xFFFF;
        return 'JR NZ,r8';
      }
      case 0x28: { // JR Z
        const off = toSigned8(this.fetch8());
        if (this.flagZ) this.pc = (this.pc + off) & 0xFFFF;
        return 'JR Z,r8';
      }

      case 0xCD: { // CALL a16
        const addr = this.fetch16();
        this.sp = (this.sp - 2) & 0xFFFF;
        this.mem[this.sp] = this.pc & 0xFF;
        this.mem[this.sp + 1] = (this.pc >> 8) & 0xFF;
        this.pc = addr;
        return 'CALL a16';
      }
      case 0xC9: { // RET
        const lo = this.mem[this.sp];
        const hi = this.mem[this.sp + 1];
        this.sp = (this.sp + 2) & 0xFFFF;
        this.pc = (hi << 8) | lo;
        return 'RET';
      }

      case 0x76: this.halted = true; return 'HALT';

      default:
        this.halted = true;
        return 'unknown opcode 0x' + opcode.toString(16) + ' at ' + (this.pc - 1).toString(16);
    }
  }
}

function toSigned8(byte) {
  return byte > 127 ? byte - 256 : byte;
}
