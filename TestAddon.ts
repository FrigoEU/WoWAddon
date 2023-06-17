/** @NoSelfInFile */

import {
  Frame,
  Texture,
  UnitId,
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
    /* icon */ FileDataId
  ]
>;
declare const _G: { [prop: string]: any };

type unit = "player" | "party1" | "party2";
type tar = "arena1" | "arena2" | "arena3";

const myFrame = CreateFrame("Frame");

myFrame.HookScript("OnEvent", function () {
  print("Setting friendly nameplate size");
  C_NamePlate.SetNamePlateFriendlySize(50, 100);
});
myFrame.RegisterEvent("PLAYER_LOGIN");

// Arena target icons
const iconSize = 28;
const offsetX = iconSize + iconSize / 4;
const frames = {
  player: [
    makeArenaTargetFrame("player", 0),
    makeArenaTargetFrame("player", -offsetX),
    makeArenaTargetFrame("player", -offsetX * 2),
  ],
  party1: [
    makeArenaTargetFrame("party1", 0),
    makeArenaTargetFrame("party1", -offsetX),
    makeArenaTargetFrame("party1", -offsetX * 2),
  ],
  party2: [
    makeArenaTargetFrame("party2", 0),
    makeArenaTargetFrame("party2", -offsetX),
    makeArenaTargetFrame("party2", -offsetX * 2),
  ],
};

type opponent = {
  specIcon: FileDataId | null;
  tar: tar;
};
let opponents: opponent[] = [];

function makeArenaTargetFrame(
  unit: unit,
  offsetX: number
): {
  frame: Frame & { icon: Texture };
  unit: unit;
  position: () => void;
} {
  const f = CreateFrame("Frame") as Frame & { icon: Texture };
  f.SetWidth(iconSize);
  f.SetHeight(iconSize);

  f.icon = f.CreateTexture(
    "arena_targetter_" + unit + "_" + offsetX.toString(),
    "BACKGROUND"
  );
  f.icon.SetWidth(iconSize);
  f.icon.SetHeight(iconSize);
  f.icon.SetPoint("CENTER", 0, 0);

  f.icon.SetTexture("Interface\\Icons\\INV_Misc_EngGizmos_17");

  return {
    frame: f,
    unit,
    position: () => {
      const frameName = "GladiusExButtonFrame" + unit;
      waitForFrame(
        frameName,
        function (container) {
          f.SetPoint("RIGHT", container, "RIGHT", offsetX, 0);
        },
        function () {
          print("Stopped waiting for frame " + frameName);
        }
      );
    },
  };
}

const isDrawTest = true;
const prevDigests: { [k in unit]: string } = {
  player: "",
  party1: "",
  party2: "",
};
C_Timer.NewTicker(0.25, function () {
  const [isArena, isRated] = IsActiveBattlefieldArena();
  if (!isArena && !isDrawTest) {
    return;
  }

  checkUnit("player");
  checkUnit("party1");
  checkUnit("party2");

  function checkUnit(unit: unit) {
    const unit_being_targetted_by: tar[] = isDrawTest
      ? ["arena1", "arena3"]
      : compact([
          is_x_targetting_y("arena1", unit) ? "arena1" : null,
          is_x_targetting_y("arena2", unit) ? "arena2" : null,
          is_x_targetting_y("arena3", unit) ? "arena3" : null,
        ]);

    const prevDigest = prevDigests[unit];
    const digest = makeTargettingDigest(unit_being_targetted_by);
    if (prevDigest !== digest) {
      redraw(unit, unit_being_targetted_by);
      prevDigests[unit] = digest;
    }
  }
});

function makeTargettingDigest(tars: tar[]): string {
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
    const icon =
      opp.specIcon ||
      ("Interface\\Icons\\INV_Misc_EngGizmos_17" as unknown as FileDataId); // temp
    fs[i].frame.icon.SetTexture(icon);
    fs[i].frame.Show();
    i++;
  });
}

// Init
const initOpponentsFrame = CreateFrame("Frame");
initOpponentsFrame.RegisterEvent("ARENA_PREP_OPPONENT_SPECIALIZATIONS");
initOpponentsFrame.HookScript("OnEvent", init);
init();

function init() {
  if (!IsActiveBattlefieldArena) {
    return;
  }
  opponents = [
    initOpponent("arena1"),
    initOpponent("arena2"),
    initOpponent("arena3"),
  ];
  NotifyInspect("arena1");
  NotifyInspect("arena2");
  NotifyInspect("arena3");

  forEach(frames.player, (f) => f.position());
  forEach(frames.party1, (f) => f.position());
  forEach(frames.party2, (f) => f.position());
}

function initOpponent(tar: tar): opponent {
  return { specIcon: null, tar };
}

const inspectFrame = CreateFrame("Frame");
inspectFrame.RegisterEvent("INSPECT_READY");
inspectFrame.HookScript("OnEvent", function () {
  for (let opp of opponents) {
    if (opp.specIcon === null) {
      const specId = GetInspectSpecialization(opp.tar);
      if (specId > 0) {
        const [_id, _n, _d, icon2] = GetSpecializationInfoByID(specId);
        opp.specIcon = icon2;
      }
    }
  }
});

// utils

function is_x_targetting_y(tar: tar, unit: unit) {
  const u = UnitGUID(unit);
  const t = UnitGUID((tar + "target") as UnitId);
  return u === t;
}

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

  for (let i = 0; i++; i < arr.length) {
    if (arr[i] !== null) {
      n.push(arr[i] as T);
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
