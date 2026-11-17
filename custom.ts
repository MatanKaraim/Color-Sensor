
//% color="#e67e22" icon="\uf1fc" block="חיישן צבע"
namespace tcsColorSensor {

    const TCS34725_ADDR = 0x29;
    const COMMAND_BIT = 0x80;

    const REG_ENABLE = 0x00;
    const REG_ATIME = 0x01;
    const REG_CONTROL = 0x0F;
    const REG_ID = 0x12;

    const REG_CDATAL = 0x14;

    export enum TCSChannel {
        //% block="אדום"
        Red,
        //% block="ירוק"
        Green,
        //% block="כחול"
        Blue,
        //% block="עוצמת אור"
        Clear
    }

    export enum TCSGain {
        //% block="1X"
        Gain_1X = 0x00,
        //% block="4X"
        Gain_4X = 0x01,
        //% block="16X"
        Gain_16X = 0x02,
        //% block="60X"
        Gain_60X = 0x03
    }

    export enum TCSTime {
        //% block="2.4ms (מהיר מאוד)"
        Time_2_4ms = 0xFF,
        //% block="24ms"
        Time_24ms = 0xF6,
        //% block="50ms (מומלץ לרובוט)"
        Time_50ms = 0xEB,
        //% block="101ms"
        Time_101ms = 0xD6,
        //% block="154ms (מדויק)"
        Time_154ms = 0xC0
    }

    export enum AllColors {
        //% block="אדום"
        Red = 0,
        //% block="ירוק"
        Green = 1,
        //% block="כחול"
        Blue = 2,
        //% block="צהוב"
        Yellow = 3,
        //% block="כתום"
        Orange = 4,
        //% block="סגול"
        Purple = 5,
        //% block="שחור"
        Black = 6,
        //% block="לבן"
        White = 7,
        //% block="צבע מותאם 1"
        Custom1 = 8,
        //% block="צבע מותאם 2"
        Custom2 = 9,
        //% block="צבע מותאם 3"
        Custom3 = 10,
        //% block="צבע מותאם 4"
        Custom4 = 11
    }

    export enum DetectedColorResult {
        //% block="אדום"
        Red = 0,
        //% block="ירוק"
        Green = 1,
        //% block="כחול"
        Blue = 2,
        //% block="צהוב"
        Yellow = 3,
        //% block="כתום"
        Orange = 4,
        //% block="סגול"
        Purple = 5,
        //% block="שחור"
        Black = 6,
        //% block="לבן"
        White = 7,
        //% block="צבע מותאם 1"
        Custom1 = 8,
        //% block="צבע מותאם 2"
        Custom2 = 9,
        //% block="צבע מותאם 3"
        Custom3 = 10,
        //% block="צבע מותאם 4"
        Custom4 = 11,
        //% block="לא ידוע"
        Unknown = 12
    }

    class ColorProfile {
        r: number;
        g: number;
        b: number;
        threshold: number;
        clearVal: number;
        clearThreshold: number;

        constructor(r: number, g: number, b: number, th: number, clearVal: number = -1, clearTh: number = 80) {
            this.r = r;
            this.g = g;
            this.b = b;
            this.threshold = th;
            this.clearVal = clearVal;
            this.clearThreshold = clearTh;
        }
    }

    let colorList: ColorProfile[] = [
        new ColorProfile(185, 45, 45, 40, -1, 80),          // Red (0)
        new ColorProfile(40, 165, 55, 40, -1, 80),          // Green (1)
        new ColorProfile(35, 80, 175, 40, -1, 80),          // Blue (2)
        new ColorProfile(165, 155, 30, 40, -1, 80),         // Yellow (3)
        new ColorProfile(195, 95, 30, 40, -1, 80),          // Orange (4)
        new ColorProfile(120, 50, 150, 40, -1, 80),         // Purple (5)
        new ColorProfile(20, 20, 20, 30, 70, 50),           // Black (6)
        new ColorProfile(95, 95, 95, 30, 800, 300),         // White (7)
        new ColorProfile(0, 0, 0, -1, -1, 80),              // Custom1 (8)
        new ColorProfile(0, 0, 0, -1, -1, 80),              // Custom2 (9)
        new ColorProfile(0, 0, 0, -1, -1, 80),              // Custom3 (10)
        new ColorProfile(0, 0, 0, -1, -1, 80)               // Custom4 (11)
    ];

    let isInitialized = false;
    let ledPin: DigitalPin = DigitalPin.P0;
    let hasLedConfigured = false;

    function write8(reg: number, val: number): void {
        let buf = pins.createBuffer(2);
        buf[0] = COMMAND_BIT | reg;
        buf[1] = val;
        pins.i2cWriteBuffer(TCS34725_ADDR, buf, false);
    }

    /**
     * אתחול פנימי אוטומטי שקורה בפעם הראשונה שקוראים או מגדירים את החיישן
     */
    function ensureInit(): void {
        if (isInitialized) return;

        pins.i2cWriteNumber(TCS34725_ADDR, COMMAND_BIT | REG_ID, NumberFormat.UInt8BE, true);
        let id = pins.i2cReadNumber(TCS34725_ADDR, NumberFormat.UInt8BE, false);
        if (id != 0x44 && id != 0x4D) {
            return;
        }

        write8(REG_ATIME, TCSTime.Time_50ms);
        write8(REG_CONTROL, TCSGain.Gain_4X);
        write8(REG_ENABLE, 0x01 | 0x02);
        basic.pause(50);

        isInitialized = true;
    }

    function readRawRGBC(): { r: number, g: number, b: number, c: number } {
        ensureInit();
        pins.i2cWriteNumber(TCS34725_ADDR, COMMAND_BIT | REG_CDATAL, NumberFormat.UInt8BE, true);
        let buf = pins.i2cReadBuffer(TCS34725_ADDR, 8, false);
        let c = buf[0] | (buf[1] << 8);
        let r = buf[2] | (buf[3] << 8);
        let g = buf[4] | (buf[5] << 8);
        let b = buf[6] | (buf[7] << 8);
        return { r: r, g: g, b: b, c: c };
    }

    function readNormalizedSample(): { r: number, g: number, b: number, c: number } {
        let raw = readRawRGBC();
        if (raw.c === 0) {
            return { r: 0, g: 0, b: 0, c: 0 };
        }
        return {
            r: Math.min(255, Math.round((raw.r / raw.c) * 255)),
            g: Math.min(255, Math.round((raw.g / raw.c) * 255)),
            b: Math.min(255, Math.round((raw.b / raw.c) * 255)),
            c: raw.c
        };
    }

    // ==========================================
    // 1. קריאת ערכים
    // ==========================================

    /**
     * קורא ערך מספרי מנורמל (0 עד 255) עבור הערוץ הנבחר
     * @param channel הערוץ לקריאה
     */
    //% group="קריאת ערכים"
    //% block="קרא ערוץ %channel"
    //% weight=100
    export function getChannelValue(channel: TCSChannel): number {
        let sample = readNormalizedSample();
        switch (channel) {
            case TCSChannel.Red: return sample.r;
            case TCSChannel.Green: return sample.g;
            case TCSChannel.Blue: return sample.b;
            case TCSChannel.Clear: return Math.min(255, Math.round((sample.c / 21504) * 255));
        }
        return 0;
    }

    /**
     * מחזיר את עוצמת האור הכללית מהחיישן
     */
    //% group="קריאת ערכים"
    //% block="עוצמת אור כללית"
    //% weight=95
    export function getLightIntensity(): number {
        let raw = readRawRGBC();
        return raw.c;
    }

    // ==========================================
    // 2. מוניטור טורי
    // ==========================================

    /**
     * מדפיס למוניטור הטורי את ערכי הצבע ועוצמת האור
     */
    //% group="מוניטור טורי"
    //% block="הדפס נתוני צבע למוניטור"
    //% weight=90
    export function printNormalizedSerial(): void {
        let sample = readNormalizedSample();
        serial.writeLine("R: " + sample.r + " | G: " + sample.g + " | B: " + sample.b + " | C: " + sample.c);
    }

    // ==========================================
    // 3. זיהוי צבעים
    // ==========================================

    function getColorDistance(colorIdx: number, r: number, g: number, b: number, c: number): number {
        let p = colorList[colorIdx];

        if (p.threshold < 0) {
            return -1;
        }

        if (p.clearVal >= 0 && Math.abs(c - p.clearVal) > p.clearThreshold) {
            return -1;
        }

        let dr = r - p.r;
        let dg = g - p.g;
        let db = b - p.b;
        let dist = Math.sqrt(dr * dr + dg * dg + db * db);

        return dist <= p.threshold ? dist : -1;
    }

    /**
     * בודק האם המשטח הנוכחי תואם לצבע שנבחר
     * @param color הצבע לבדיקה
     */
    //% group="זיהוי צבעים"
    //% block="האם מזוהה צבע %color ?"
    //% weight=85
    export function isColor(color: AllColors): boolean {
        let sample = readNormalizedSample();
        return getColorDistance(color, sample.r, sample.g, sample.b, sample.c) >= 0;
    }

    /**
     * מחזיר את הצבע שהכי קרוב למשטח הנקרא כרגע
     */
    //% group="זיהוי צבעים"
    //% block="צבע שזוהה"
    //% weight=80
    export function getDetectedColor(): DetectedColorResult {
        let sample = readNormalizedSample();

        let bestMatch = -1;
        let minDistance = 9999;

        for (let i = 0; i < colorList.length; i++) {
            let dist = getColorDistance(i, sample.r, sample.g, sample.b, sample.c);
            if (dist >= 0 && dist < minDistance) {
                minDistance = dist;
                bestMatch = i;
            }
        }

        if (bestMatch !== -1) {
            return bestMatch as DetectedColorResult;
        }

        return DetectedColorResult.Unknown;
    }

    // ==========================================
    // 4. הגדרת צבעים
    // ==========================================

    /**
     * מגדיר ערכי R, G, B, טווח סטייה, ועוצמת אור. השארת עוצמת אור על 1- תתעלם ממנה.
     */
    //% group="הגדרת צבעים"
    //% block="הגדר צבע %color | R: %r G: %g B: %b סטייה: %threshold | עוצמת אור (1- להתעלמות): %clearVal סטייה: %clearThreshold"
    //% r.min=0 r.max=255 r.defl=150
    //% g.min=0 g.max=255 g.defl=50
    //% b.min=0 b.max=255 b.defl=50
    //% threshold.min=1 threshold.max=200 threshold.defl=35
    //% clearVal.defl=-1
    //% clearThreshold.min=1 clearThreshold.max=2000 clearThreshold.defl=80
    //% weight=70
    export function setColorProfile(
        color: AllColors,
        r: number,
        g: number,
        b: number,
        threshold: number,
        clearVal: number,
        clearThreshold: number
    ): void {
        let p = colorList[color];
        p.r = r;
        p.g = g;
        p.b = b;
        p.threshold = threshold;
        p.clearVal = clearVal;
        p.clearThreshold = clearThreshold;
    }

    // ==========================================
    // 5. מתקדם (לד, רגישות וזמן דגימה)
    // ==========================================

    /**
     * מגדיר את הפין אליו מחובר הלד ומדליק אותו
     * @param pin מספר הפין
     */
    //% group="מתקדם"
    //% block="הגדר פין לד %pin והדלק"
    //% pin.defl=DigitalPin.P0
    //% weight=60
    export function setupLedPin(pin: DigitalPin): void {
        ledPin = pin;
        hasLedConfigured = true;
        pins.digitalWritePin(ledPin, 1);
    }

    /**
     * קובע מצב דולק או כבוי ללד
     * @param on דלוק / כבוי
     */
    //% group="מתקדם"
    //% block="קבע לד חיישן צבע ל- %on"
    //% on.shadow="toggleOnOff"
    //% weight=55
    export function setLed(on: boolean): void {
        if (hasLedConfigured) {
            pins.digitalWritePin(ledPin, on ? 1 : 0);
        }
    }

    /**
     * כוון את רגישות החיישן (הגבר)
     * @param gain רמת ההגבר
     */
    //% group="מתקדם"
    //% block="כוון רגישות (הגבר) ל- %gain"
    //% weight=50
    export function setGain(gain: TCSGain): void {
        ensureInit();
        write8(REG_CONTROL, gain);
    }

    /**
     * כוון את זמן דגימת הנתונים של החיישן
     * @param time משך הדגימה
     */
    //% group="מתקדם"
    //% block="כוון זמן דגימה ל- %time"
    //% weight=45
    export function setIntegrationTime(time: TCSTime): void {
        ensureInit();
        write8(REG_ATIME, time);
    }
}