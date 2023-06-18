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
    /* icon */ FileDataId
  ]
>;
declare const _G: { [prop: string]: any };

type unit = "player" | "party1" | "party2";
type tar = "arena1" | "arena2" | "arena3";

const isDrawTest = false;

const myFrame = CreateFrame("Frame");

myFrame.HookScript("OnEvent", function () {
  print("Setting friendly nameplate size");
  C_NamePlate.SetNamePlateFriendlySize(50, 100);
});
myFrame.RegisterEvent("PLAYER_LOGIN");

// Arena target icons
const iconSize = 25;
const offsetX = iconSize / 5;
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
  tar: tar;
};
let opponents: opponent[] = [];

function makeArenaTargetFrames(unit: unit): partyIconFrame[] {
  return [
    makeArenaTargetFrame(unit, -offsetX),
    makeArenaTargetFrame(unit, -iconSize - offsetX * 2),
    makeArenaTargetFrame(unit, -iconSize * 2 - offsetX * 3),
  ];
}

function makeArenaTargetFrame(unit: unit, offsetX: number): partyIconFrame {
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

  f.Hide();

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
      print(tar + " is targetting " + target);
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
      print("Redrawing " + unit + " - " + digest);
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
    const icon =
      opp.specIcon ||
      ("Interface\\Icons\\INV_Misc_EngGizmos_17" as unknown as FileDataId); // temp
    fs[i].frame.icon.SetTexture(icon);
    fs[i].frame.Show();
    i++;
  });
}

// Init
const initFrame = CreateFrame("Frame");
initFrame.RegisterEvent("ARENA_PREP_OPPONENT_SPECIALIZATIONS");
initFrame.HookScript("OnEvent", init);
init();

function init() {
  print("Initting");
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
  if (specId !== null && specId > 0) {
    const [_id, _n, _d, icon2] = GetSpecializationInfoByID(specId);
    specIcon = icon2;
  } else {
    specIcon =
      "Interface\\Icons\\INV_Misc_EngGizmos_17" as unknown as FileDataId;
  }
  return { specIcon, tar };
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
