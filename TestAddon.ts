/** @NoSelfInFile */

import {
  CLASSES,
  Frame,
  Texture,
  UnitId,
  UnitRoleType,
} from "./node_modules/@wartoshika/wow-declarations/declarations/index";

declare const C_NamePlate: {
  SetNamePlateFriendlySize(this: void, x: number, y: number): void;
};
declare const C_Timer: {
  NewTicker(
    this: void,
    seconds: number,
    cb: () => void,
    iterations?: number
  ): {
    Cancel: () => void;
  };
  After(this: void, seconds: number, cb: () => void): void;
};
declare const SetPortraitToTexture: (this: void, f: Texture, s: string) => void;
type SpecializationId = number;
type FileDataId = number;
declare const NotifyInspect: (this: void, u: UnitId) => void;
declare const IsActiveBattlefieldArena: (
  this: void
) => LuaMultiReturn<[boolean, boolean]>;
declare const GetArenaOpponentSpec: (
  this: void,
  id: number
) => LuaMultiReturn<[SpecializationId, number]>;
declare const GetInspectSpecialization: (
  this: void,
  u: UnitId
) => SpecializationId;

declare function GetSpecializationInfoByID(
  this: void,
  id: SpecializationId
): LuaMultiReturn<
  [
    SpecializationId,
    /* name */ string,
    /* description */ string,
    /* icon */ FileDataId,
    UnitRoleType,
    CLASSES
  ]
>;
declare function GetClassColor(
  englishClass: CLASSES
): LuaMultiReturn<[number, number, number, string]>;
declare const _G: { [prop: string]: any };

type unit = "player" | "party1" | "party2";
type tar = "arena1" | "arena2" | "arena3";

const isDrawTest = false;
const debugging = false;
const drawMode: "icon" | "color" = "color";

const myFrame = CreateFrame("Frame");

function debug(s: string) {
  if (debugging) {
    print(s);
  }
}

myFrame.HookScript("OnEvent", function () {
  debug("Setting friendly nameplate size");
  C_NamePlate.SetNamePlateFriendlySize(50, 100);
});
myFrame.RegisterEvent("PLAYER_LOGIN");

// Arena target icons
const iconSize = 25;
const iconOffsetX = iconSize / 5;
const frames = {
  player: makeArenaTargetFrames("player"),
  party1: makeArenaTargetFrames("party1"),
  party2: makeArenaTargetFrames("party2"),
};
type partyIconFrame = {
  frame: Frame & { icon: Texture };
  unit: unit;
  position: () => void;
};

type opponent = {
  specIcon: FileDataId;
  role: UnitRoleType;
  class: CLASSES;
  classColor: [number, number, number];
  tar: tar;
};
let opponents: opponent[] = [];

function makeArenaTargetFrames(unit: unit): partyIconFrame[] {
  return [
    makeArenaTargetFrame(unit, 0),
    makeArenaTargetFrame(unit, 1),
    makeArenaTargetFrame(unit, 2),
  ];
}

function makeArenaTargetFrame(unit: unit, index: 0 | 1 | 2): partyIconFrame {
  const offsetX =
    index === 0
      ? -iconOffsetX
      : index == 1
      ? -iconSize - iconOffsetX * 2
      : -iconSize * 2 - iconOffsetX * 3;
  const f =
    drawMode === "icon"
      ? (CreateFrame("Frame") as Frame & { icon: Texture })
      : (CreateFrame(
          "Frame",
          undefined,
          UIParent,
          "TooltipBorderedFrameTemplate"
          // "ThinBorderTemplate"
          // "UIPanelButtonTemplate"
        ) as Frame & { icon: Texture });

  f.icon = f.CreateTexture(
    "arena_targetter_" + unit + "_" + offsetX.toString(),
    "BACKGROUND"
  );
  if (drawMode === "icon") {
    f.SetWidth(iconSize);
    f.SetHeight(iconSize);
    f.icon.SetWidth(iconSize);
    f.icon.SetHeight(iconSize);
  } else {
    f.SetWidth(iconSize + 4);
    f.SetHeight(iconSize + 4);
    f.icon.SetWidth(iconSize);
    f.icon.SetHeight(iconSize);
  }
  f.icon.SetPoint("CENTER", 0, 0);

  // f.icon.SetTexture("Interface\\Icons\\INV_Misc_EngGizmos_17");

  f.Hide();

  return {
    frame: f,
    unit,
    position: () => {
      const frameName = "GladiusExButtonFrame" + unit;
      waitForFrame(
        frameName,
        function (container) {
          f.SetPoint("LEFT", container, "LEFT", -1 * offsetX, 0);
        },
        function () {
          debug("Stopped waiting for frame " + frameName);
        }
      );
    },
  };
}

function draw(f: partyIconFrame, opp: opponent): void {
  if (drawMode === "icon") {
    drawIcon();
  } else {
    drawColor();
  }

  function drawIcon() {
    const icon =
      opp.specIcon ||
      ("Interface\\Icons\\INV_Misc_EngGizmos_17" as unknown as FileDataId); // temp
    f.frame.icon.SetTexture(icon);
  }

  function drawColor() {
    f.frame.icon.SetColorTexture(
      opp.classColor[0],
      opp.classColor[1],
      opp.classColor[2]
    );

    // f.frame.SetBackdrop({
    //   edgeFile: "edgeFile",
    //   // tile = false,
    //   // tileEdge = false,
    //   // tileSize = 0,
    //   edgeSize: 32,
    //   insets: { left: 0, right: 0, top: 0, bottom: 0 },
    // });
  }

  f.frame.Show();
}

const allUnits: unit[] = ["player", "party1", "party2"];

const prevDigests: { [k in unit]: string } = {
  player: "",
  party1: "",
  party2: "",
};
const updateInterval = 1;
C_Timer.NewTicker(updateInterval, function () {
  const [isArena, isRated] = IsActiveBattlefieldArena();
  if (!isArena && !isDrawTest) {
    return;
  }

  const targetted_by: { [u in unit]: tar[] } = {
    player: isDrawTest ? ["arena1", "arena2", "arena3"] : [],
    party1: isDrawTest ? ["arena1", "arena2", "arena3"] : [],
    party2: isDrawTest ? ["arena1", "arena2", "arena3"] : [],
  };

  const unitGuids: { [u in unit]: string } = {
    player: UnitGUID("player"),
    party1: UnitGUID("party1"),
    party2: UnitGUID("party2"),
  };

  checkUnit("arena1");
  checkUnit("arena2");
  checkUnit("arena3");

  function checkUnit(tar: tar) {
    const target = UnitGUID((tar + "target") as UnitId);

    if (target !== null) {
      debug(tar + " is targetting " + target);
      forEach(allUnits, (unit) => {
        if (target === unitGuids[unit]) {
          targetted_by[unit].push(tar);
        }
      });
    }
  }

  forEach(allUnits, (unit) => {
    const unit_being_targetted_by = targetted_by[unit];
    const prevDigest = prevDigests[unit];
    const digest = join(unit_being_targetted_by);
    if (prevDigest !== digest) {
      debug("Redrawing " + unit + " - " + digest);
      redraw(unit, unit_being_targetted_by);
      prevDigests[unit] = digest;
    }
  });
});

function join(tars: tar[]): string {
  let res = "";
  for (let tar of tars) {
    res += tar;
  }
  return res;
}

function redraw(unit: unit, targetted_by: tar[]) {
  const fs = frames[unit];
  forEach(fs, (f) => f.frame.Hide());
  let i = 0;
  forEach(targetted_by, (f) => {
    const opp = find(opponents, (opp) => opp.tar === f);
    if (!opp) {
      return;
    }
    if (opp.role !== "HEALER") {
      draw(fs[i], opp);
      i++;
    }
  });
}

// Init
const initFrame = CreateFrame("Frame");
initFrame.RegisterEvent("ARENA_PREP_OPPONENT_SPECIALIZATIONS");
initFrame.HookScript("OnEvent", init);
init();

function init() {
  debug("Initting");
  const [isArena, _] = IsActiveBattlefieldArena();
  if (!isArena && !isDrawTest) {
    return;
  }
  opponents = [
    initOpponent("arena1"),
    initOpponent("arena2"),
    initOpponent("arena3"),
  ];

  forEach(frames.player, (f) => f.position());
  forEach(frames.party1, (f) => f.position());
  forEach(frames.party2, (f) => f.position());
}

function initOpponent(tar: tar): opponent {
  const [specId] = GetArenaOpponentSpec(
    tar === "arena1" ? 1 : tar === "arena2" ? 2 : 3
  );
  let specIcon: FileDataId;
  let classColorOut: [number, number, number];
  let role: UnitRoleType;
  let cl: CLASSES;

  if (specId !== null && specId > 0) {
    const [_id, _n, _d, icon2, r, className] =
      GetSpecializationInfoByID(specId);
    specIcon = icon2;
    const classColor = GetClassColor(className);
    classColorOut = [classColor[0], classColor[1], classColor[2]];
    role = r;
    cl = className;
  } else {
    specIcon =
      "Interface\\Icons\\INV_Misc_EngGizmos_17" as unknown as FileDataId;
    classColorOut = [1, 0, 0];
    role = "DAMAGER";
    cl = "WARLOCK";
  }
  return { specIcon, tar, classColor: classColorOut, role, class: cl };
}

// utils

function waitForFrame(
  frameName: string,
  cb: (f: Frame) => void,
  err: () => void
) {
  const max_iter = 50;
  const t = C_Timer.NewTicker(0.1, impl, max_iter);
  let i = 0;
  function impl() {
    i++;
    const f = _G[frameName] as Frame | undefined;
    if (f && f.IsVisible()) {
      cb(f);
      t.Cancel();
    } else {
      if (i === max_iter) {
        err();
      }
    }
  }
}

function compact<T>(arr: (T | null)[]): T[] {
  const n: T[] = [];

  for (let i of arr) {
    if (i !== null) {
      n.push(i);
    }
  }

  return n;
}

function forEach<T>(arr: T[], cb: (t: T) => void) {
  for (let i of arr) {
    cb(i);
  }
}

function find<T>(arr: T[], cb: (t: T) => boolean): T | undefined {
  for (let i of arr) {
    if (cb(i)) {
      return i;
    }
  }
  return undefined;
}
