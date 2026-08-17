import { buildImageFloor, type ImgFloorSpec, type ImgRoom } from "./buildImageFloor";
import type { Floor, VerticalLink } from "./types";
import floor1Img from "@/assets/floors/floor-1.png";
import floor2Img from "@/assets/floors/floor-2.png";
import floor3Img from "@/assets/floors/floor-3.png";
import floor4Img from "@/assets/floors/floor-4.png";

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  AB-4 FLOOR DATA — floors 1-4, traced onto the real floor-plan images
 * ─────────────────────────────────────────────────────────────────────────
 *  Each floor's map background is the actual plan drawing (src/assets/floors).
 *  The navigation graph is authored in that image's pixel coordinates: every
 *  room contributes a doorway node on the central corridor, keyed to the room
 *  centre `yc` measured off the plan. Stairs and lifts stack across floors via
 *  matching `vshaft` keys and are connected in VERTICAL_LINKS.
 *
 *  Shaft keys: faculty-lift · lift-upper · lift-lower · stair-upper · stair-lower
 * ─────────────────────────────────────────────────────────────────────────
 */

const BUILDING = "AB-4";
const IMG_H = 2620;

// shared corridor geometry (image pixels) — the corridor is a near-central
// vertical spine that bends to the store room at the bottom.
// The four floor plans were cropped independently, so the corridor sits at a
// different x on each floor (measured centres: F1 258, F2 289, F3 291, F4 333).
// Everything x-related is therefore shifted per floor by SHIFT so the route
// runs down the exact centre of the purple corridor on every floor.
const SHIFT: Record<string, number> = { "ab4-1": 0, "ab4-2": 31, "ab4-3": 33, "ab4-4": 75 };

const geo = (s: number) => ({
  corridorX: 258 + s,
  leftDoorX: 240 + s,
  rightDoorX: 276 + s,
  leftMarkerX: 150 + s,
  rightMarkerX: 365 + s,
  topY: 180,
});
const tailFor = (s: number): Array<[number, number]> => [
  [258 + s, 2300],
  [258 + s, 2440],
  [300 + s, 2545],
  [355 + s, 2585],
];
const storeXY = (s: number) => ({ mx: 393 + s, my: 2585 });

const facultyLift = (): ImgRoom => ({
  key: "faculty-lift",
  name: "Faculty Lift",
  cat: "lift",
  side: "left",
  yc: 118,
  vertical: "lift",
  vshaft: "faculty-lift",
  keywords: ["lift", "elevator", "staff"],
});
const fireExit = (yc: number): ImgRoom => ({
  key: "fire-exit",
  name: "Fire Exit",
  cat: "entrance",
  side: "right",
  yc,
  noSearch: true,
  keywords: ["emergency", "exit"],
});
const wash = (key: string, num: string, side: "left" | "right", yc: number): ImgRoom => ({
  key,
  num,
  name: "Female Washroom",
  cat: "washroom",
  side,
  yc,
  keywords: ["toilet", "restroom", "ladies", "washroom"],
});
const balcony = (key: string, yc: number): ImgRoom => ({
  key,
  name: "Balcony",
  cat: "other",
  side: "right",
  yc,
  noSearch: true,
});

const floor1: ImgFloorSpec = {
  id: "ab4-1",
  name: "Floor 1",
  level: 1,
  building: BUILDING,
  image: floor1Img,
  imgW: 610,
  imgH: IMG_H,
  ...geo(SHIFT["ab4-1"]!),
  tail: tailFor(SHIFT["ab4-1"]!),
  rooms: [
    facultyLift(),
    { key: "123", num: "123", name: "Staff Room", cat: "office", side: "left", yc: 255, keywords: ["staff"] },
    wash("122", "122", "left", 380),
    wash("121", "121", "left", 491),
    { key: "lift-u", name: "Student Lift", cat: "lift", side: "left", yc: 596, vertical: "lift", vshaft: "lift-upper", keywords: ["lift", "elevator"] },
    { key: "120", num: "120", name: "Room 120", cat: "classroom", side: "left", yc: 720 },
    { key: "open-1a", name: "Open Space", cat: "other", side: "left", yc: 832, noSearch: true },
    { key: "118", num: "118", name: "Room 118", cat: "classroom", side: "left", yc: 917 },
    { key: "prof-1a", name: "Professor Room", cat: "office", side: "left", yc: 996, keywords: ["faculty", "teacher"] },
    { key: "117ab", num: "117A/B", name: "Room 117A / 117B", cat: "classroom", side: "left", yc: 1068 },
    { key: "open-1b", name: "Open Space", cat: "other", side: "left", yc: 1166, noSearch: true },
    { key: "116", num: "116", name: "Room 116", cat: "classroom", side: "left", yc: 1264 },
    { key: "prof-1b", name: "Professor Room", cat: "office", side: "left", yc: 1356, keywords: ["faculty", "teacher"] },
    { key: "115ab", num: "115A/B", name: "Room 115A / 115B", cat: "classroom", side: "left", yc: 1415 },
    { key: "open-1c", name: "Open Space", cat: "other", side: "left", yc: 1493, noSearch: true },
    { key: "lift-l", name: "Student Lift", cat: "lift", side: "left", yc: 1670, vertical: "lift", vshaft: "lift-lower", keywords: ["lift", "elevator"] },
    wash("113", "113", "left", 1782),
    wash("112", "112", "left", 1893),
    { key: "111", num: "111", name: "Room 111", cat: "classroom", side: "left", yc: 2076 },
    fireExit(118),
    { key: "101", num: "101", name: "Meeting Room", cat: "hall", side: "right", yc: 373, keywords: ["conference", "meeting"] },
    { key: "stair-u", name: "Staircase", cat: "stairs", side: "right", yc: 603, vertical: "stairs", vshaft: "stair-upper", keywords: ["stairs", "steps"] },
    balcony("bal-1a", 714),
    { key: "103", num: "103", name: "Room 103", cat: "classroom", side: "right", yc: 812 },
    { key: "104", num: "104", name: "Lecture Hall 104", cat: "hall", side: "right", yc: 924, keywords: ["lecture", "hall"] },
    { key: "105", num: "105", name: "Lecture Hall 105", cat: "hall", side: "right", yc: 1159, keywords: ["lecture", "hall"] },
    { key: "106", num: "106", name: "Lecture Hall 106", cat: "hall", side: "right", yc: 1408, keywords: ["lecture", "hall"] },
    balcony("bal-1b", 1585),
    { key: "stair-l", name: "Staircase", cat: "stairs", side: "right", yc: 1690, vertical: "stairs", vshaft: "stair-lower", keywords: ["stairs", "steps"] },
    { key: "107", num: "107", name: "Common Room", cat: "hall", side: "right", yc: 1795, keywords: ["common"] },
    { key: "108", num: "108", name: "Room 108", cat: "classroom", side: "right", yc: 1893 },
    { key: "109", num: "109", name: "Cultural & Sports Room", cat: "hall", side: "right", yc: 2076, keywords: ["cultural", "sports"] },
  ],
  store: { key: "110", num: "110", name: "Store Room", cat: "facility", ...storeXY(SHIFT["ab4-1"]!), keywords: ["storage"] },
};

const floor2: ImgFloorSpec = {
  id: "ab4-2",
  name: "Floor 2",
  level: 2,
  building: BUILDING,
  image: floor2Img,
  imgW: 620,
  imgH: IMG_H,
  ...geo(SHIFT["ab4-2"]!),
  tail: tailFor(SHIFT["ab4-2"]!),
  rooms: [
    facultyLift(),
    { key: "223", num: "223", name: "Class Room 223", cat: "classroom", side: "left", yc: 255 },
    wash("222", "222", "left", 380),
    wash("221", "221", "left", 491),
    { key: "lift-u", name: "Student Lift", cat: "lift", side: "left", yc: 596, vertical: "lift", vshaft: "lift-upper", keywords: ["lift", "elevator"] },
    { key: "218", num: "218", name: "Room 218", cat: "classroom", side: "left", yc: 720 },
    { key: "217", num: "217", name: "Room 217", cat: "classroom", side: "left", yc: 819 },
    { key: "216", num: "216", name: "Room 216", cat: "classroom", side: "left", yc: 917 },
    balcony("bal-2a", 1035),
    { key: "open-2a", name: "Open Space", cat: "other", side: "left", yc: 1192, noSearch: true },
    { key: "215ab", num: "215A/B", name: "Room 215A / 215B", cat: "classroom", side: "left", yc: 1290 },
    { key: "214", num: "214", name: "Room 214", cat: "classroom", side: "left", yc: 1376 },
    balcony("bal-2b", 1467),
    { key: "213", num: "213", name: "Room 213", cat: "classroom", side: "left", yc: 1559 },
    { key: "lift-l", name: "Student Lift", cat: "lift", side: "left", yc: 1657, vertical: "lift", vshaft: "lift-lower", keywords: ["lift", "elevator"] },
    wash("212", "212", "left", 1775),
    wash("211", "211", "left", 1893),
    { key: "210", num: "210", name: "Room 210", cat: "classroom", side: "left", yc: 2070 },
    fireExit(118),
    { key: "201", num: "201", name: "Lecture Hall 201", cat: "hall", side: "right", yc: 347, keywords: ["lecture", "hall"] },
    { key: "stair-u", name: "Staircase", cat: "stairs", side: "right", yc: 603, vertical: "stairs", vshaft: "stair-upper", keywords: ["stairs", "steps"] },
    balcony("bal-2c", 714),
    { key: "202", num: "202", name: "Room 202", cat: "classroom", side: "right", yc: 819 },
    { key: "203", num: "203", name: "Lecture Hall 203", cat: "hall", side: "right", yc: 937, keywords: ["lecture", "hall"] },
    { key: "204", num: "204", name: "Lecture Hall 204", cat: "hall", side: "right", yc: 1166, keywords: ["lecture", "hall"] },
    { key: "205", num: "205", name: "Lecture Hall 205", cat: "hall", side: "right", yc: 1395, keywords: ["lecture", "hall"] },
    balcony("bal-2d", 1559),
    { key: "stair-l", name: "Staircase", cat: "stairs", side: "right", yc: 1664, vertical: "stairs", vshaft: "stair-lower", keywords: ["stairs", "steps"] },
    { key: "206", num: "206", name: "Mobile Computing & Distribution Systems Lab", cat: "lab", side: "right", yc: 1782, keywords: ["lab", "computing", "mobile", "distribution"] },
    { key: "207", num: "207", name: "IoT Lab", cat: "lab", side: "right", yc: 1893, keywords: ["lab", "iot", "internet of things"] },
    { key: "208", num: "208", name: "Class 208", cat: "classroom", side: "right", yc: 2070, keywords: ["class"] },
  ],
  store: { key: "209", num: "209", name: "Store Room", cat: "facility", ...storeXY(SHIFT["ab4-2"]!), keywords: ["storage"] },
};

const floor3: ImgFloorSpec = {
  id: "ab4-3",
  name: "Floor 3",
  level: 3,
  building: BUILDING,
  image: floor3Img,
  imgW: 620,
  imgH: IMG_H,
  ...geo(SHIFT["ab4-3"]!),
  tail: tailFor(SHIFT["ab4-3"]!),
  rooms: [
    facultyLift(),
    { key: "321", num: "321", name: "Class Room 321", cat: "classroom", side: "left", yc: 255 },
    wash("320", "320", "left", 380),
    wash("319", "319", "left", 491),
    { key: "lift-u", name: "Student Lift", cat: "lift", side: "left", yc: 596, vertical: "lift", vshaft: "lift-upper", keywords: ["lift", "elevator"] },
    { key: "318", num: "318", name: "Room 318", cat: "classroom", side: "left", yc: 714 },
    { key: "317", num: "317", name: "Room 317", cat: "classroom", side: "left", yc: 812 },
    { key: "316", num: "316", name: "Room 316", cat: "classroom", side: "left", yc: 956 },
    balcony("bal-3a", 1133),
    { key: "315", num: "315", name: "Lecture Hall 315", cat: "hall", side: "left", yc: 1356, keywords: ["lecture", "hall"] },
    { key: "314", num: "314", name: "Room 314", cat: "classroom", side: "left", yc: 1493 },
    { key: "313", num: "313", name: "Room 313", cat: "classroom", side: "left", yc: 1579 },
    { key: "lift-l", name: "Student Lift", cat: "lift", side: "left", yc: 1670, vertical: "lift", vshaft: "lift-lower", keywords: ["lift", "elevator"] },
    wash("312", "312", "left", 1782),
    wash("311", "311", "left", 1900),
    { key: "310", num: "310", name: "Room 310", cat: "classroom", side: "left", yc: 2083 },
    fireExit(118),
    { key: "301", num: "301", name: "Lecture Hall 301", cat: "hall", side: "right", yc: 328, keywords: ["lecture", "hall"] },
    { key: "stair-u", name: "Staircase", cat: "stairs", side: "right", yc: 596, vertical: "stairs", vshaft: "stair-upper", keywords: ["stairs", "steps"] },
    balcony("bal-3b", 707),
    { key: "302", num: "302", name: "Room 302", cat: "classroom", side: "right", yc: 806 },
    { key: "303", num: "303", name: "Lecture Hall 303", cat: "hall", side: "right", yc: 924, keywords: ["lecture", "hall"] },
    { key: "304", num: "304", name: "Lecture Hall 304", cat: "hall", side: "right", yc: 1153, keywords: ["lecture", "hall"] },
    { key: "305ab", num: "305A/B", name: "Room 305A / 305B", cat: "classroom", side: "right", yc: 1369, keywords: ["open space"] },
    balcony("bal-3c", 1572),
    { key: "stair-l", name: "Staircase", cat: "stairs", side: "right", yc: 1677, vertical: "stairs", vshaft: "stair-lower", keywords: ["stairs", "steps"] },
    { key: "306", num: "306", name: "Data Mining & Warehousing Lab", cat: "lab", side: "right", yc: 1775, keywords: ["lab", "data mining", "warehousing"] },
    { key: "307", num: "307", name: "Software Testing Lab", cat: "lab", side: "right", yc: 1893, keywords: ["lab", "software", "testing"] },
    { key: "308", num: "308", name: "Room 308", cat: "classroom", side: "right", yc: 2076 },
  ],
  store: { key: "309", num: "309", name: "Store Room", cat: "facility", ...storeXY(SHIFT["ab4-3"]!), keywords: ["storage"] },
};

const floor4: ImgFloorSpec = {
  id: "ab4-4",
  name: "Floor 4",
  level: 4,
  building: BUILDING,
  image: floor4Img,
  imgW: 620,
  imgH: IMG_H,
  ...geo(SHIFT["ab4-4"]!),
  tail: tailFor(SHIFT["ab4-4"]!),
  rooms: [
    facultyLift(),
    { key: "421", num: "421", name: "Class Room 421", cat: "classroom", side: "left", yc: 269 },
    wash("420", "420", "left", 393),
    wash("419", "419", "left", 504),
    { key: "lift-u", name: "Student Lift", cat: "lift", side: "left", yc: 603, vertical: "lift", vshaft: "lift-upper", keywords: ["lift", "elevator"] },
    { key: "418", num: "418", name: "Room 418", cat: "classroom", side: "left", yc: 727 },
    { key: "417ab", num: "417A/B", name: "Room 417A / 417B", cat: "classroom", side: "left", yc: 937, keywords: ["open space"] },
    { key: "416", num: "416", name: "Lecture Hall 416", cat: "hall", side: "left", yc: 1166, keywords: ["lecture", "hall"] },
    { key: "415", num: "415", name: "Lecture Hall 415", cat: "hall", side: "left", yc: 1408, keywords: ["lecture", "hall"] },
    { key: "414", num: "414", name: "Room 414", cat: "classroom", side: "left", yc: 1559 },
    { key: "lift-l", name: "Student Lift", cat: "lift", side: "left", yc: 1657, vertical: "lift", vshaft: "lift-lower", keywords: ["lift", "elevator"] },
    wash("413", "413", "left", 1775),
    wash("412", "412", "left", 1893),
    { key: "411", num: "411", name: "Room 411", cat: "classroom", side: "left", yc: 2070 },
    fireExit(124),
    { key: "401", num: "401", name: "Lecture Hall 401", cat: "hall", side: "right", yc: 341, keywords: ["lecture", "hall"] },
    { key: "stair-u", name: "Staircase", cat: "stairs", side: "right", yc: 603, vertical: "stairs", vshaft: "stair-upper", keywords: ["stairs", "steps"] },
    balcony("bal-4a", 727),
    { key: "402", num: "402", name: "Room 402", cat: "classroom", side: "right", yc: 819 },
    { key: "403", num: "403", name: "Lecture Hall 403", cat: "hall", side: "right", yc: 937, keywords: ["lecture", "hall"] },
    { key: "404", num: "404", name: "Lecture Hall 404", cat: "hall", side: "right", yc: 1166, keywords: ["lecture", "hall"] },
    { key: "405", num: "405", name: "Room 405", cat: "classroom", side: "right", yc: 1290 },
    { key: "open-4a", name: "Open Space", cat: "other", side: "right", yc: 1408, noSearch: true },
    balcony("bal-4b", 1559),
    { key: "stair-l", name: "Staircase", cat: "stairs", side: "right", yc: 1664, vertical: "stairs", vshaft: "stair-lower", keywords: ["stairs", "steps"] },
    { key: "406", num: "406", name: "Computing & Automation Lab", cat: "lab", side: "right", yc: 1775, keywords: ["lab", "computing", "automation"] },
    { key: "407", num: "407", name: "Record Room", cat: "office", side: "right", yc: 1893, keywords: ["records"] },
    { key: "408", num: "408", name: "Library", cat: "library", side: "right", yc: 2070, keywords: ["books", "reading", "study"] },
  ],
  store: { key: "410", num: "410", name: "Store Room", cat: "facility", ...storeXY(SHIFT["ab4-4"]!), keywords: ["storage"] },
};

const built = [floor1, floor2, floor3, floor4].map(buildImageFloor);

export const FLOORS: Floor[] = built.map((b) => b.floor);

// ── vertical links: connect each shaft across all floors ─────────────────────
const SHAFT_MODE: Record<string, "stairs" | "lift"> = {
  "faculty-lift": "lift",
  "lift-upper": "lift",
  "lift-lower": "lift",
  "stair-upper": "stairs",
  "stair-lower": "stairs",
};

export const VERTICAL_LINKS: VerticalLink[] = Object.keys(SHAFT_MODE)
  .map((key) => ({
    mode: SHAFT_MODE[key]!,
    nodes: built.filter((b) => b.shafts[key]).map((b) => b.shafts[key]!),
  }))
  .filter((v) => v.nodes.length > 1);
