--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local makeArenaTargetFrames, makeArenaTargetFrame, join, redraw, init, initOpponent, waitForFrame, forEach, find, isDrawTest, iconSize, offsetX, frames, opponents
function makeArenaTargetFrames(unit)
    return {
        makeArenaTargetFrame(unit, -offsetX),
        makeArenaTargetFrame(unit, -iconSize - offsetX * 2),
        makeArenaTargetFrame(unit, -iconSize * 2 - offsetX * 3)
    }
end
function makeArenaTargetFrame(unit, offsetX)
    local f = CreateFrame("Frame")
    f:SetWidth(iconSize)
    f:SetHeight(iconSize)
    f.icon = f:CreateTexture(
        (("arena_targetter_" .. unit) .. "_") .. tostring(offsetX),
        "BACKGROUND"
    )
    f.icon:SetWidth(iconSize)
    f.icon:SetHeight(iconSize)
    f.icon:SetPoint("CENTER", 0, 0)
    f.icon:SetTexture("Interface\\Icons\\INV_Misc_EngGizmos_17")
    f:Hide()
    return {
        frame = f,
        unit = unit,
        position = function()
            local frameName = "GladiusExButtonFrame" .. unit
            waitForFrame(
                frameName,
                function(container)
                    f:SetPoint(
                        "RIGHT",
                        container,
                        "RIGHT",
                        offsetX,
                        0
                    )
                end,
                function()
                    print("Stopped waiting for frame " .. frameName)
                end
            )
        end
    }
end
function join(tars)
    local res = ""
    for ____, tar in ipairs(tars) do
        res = res .. tar
    end
    return res
end
function redraw(unit, targetted_by)
    local fs = frames[unit]
    forEach(
        fs,
        function(f) return f.frame:Hide() end
    )
    local i = 0
    forEach(
        targetted_by,
        function(f)
            local opp = find(
                opponents,
                function(opp) return opp.tar == f end
            )
            if not opp then
                return
            end
            local icon = opp.specIcon or "Interface\\Icons\\INV_Misc_EngGizmos_17"
            fs[i + 1].frame.icon:SetTexture(icon)
            fs[i + 1].frame:Show()
            i = i + 1
        end
    )
end
function init()
    print("Initting")
    local isArena, _ = IsActiveBattlefieldArena()
    if not isArena and not isDrawTest then
        return
    end
    opponents = {
        initOpponent("arena1"),
        initOpponent("arena2"),
        initOpponent("arena3")
    }
    forEach(
        frames.player,
        function(f) return f:position() end
    )
    forEach(
        frames.party1,
        function(f) return f:position() end
    )
    forEach(
        frames.party2,
        function(f) return f:position() end
    )
end
function initOpponent(tar)
    local specId = GetArenaOpponentSpec(tar == "arena1" and 1 or (tar == "arena2" and 2 or 3))
    local specIcon
    if specId ~= nil and specId > 0 then
        local _id, _n, _d, icon2 = GetSpecializationInfoByID(specId)
        specIcon = icon2
    else
        specIcon = "Interface\\Icons\\INV_Misc_EngGizmos_17"
    end
    return {specIcon = specIcon, tar = tar}
end
function waitForFrame(frameName, cb, err)
    local impl, max_iter, t, i
    function impl()
        i = i + 1
        local f = _G[frameName]
        if f and f:IsVisible() then
            cb(f)
            t:Cancel()
        else
            if i == max_iter then
                err()
            end
        end
    end
    max_iter = 50
    t = C_Timer.NewTicker(0.1, impl, max_iter)
    i = 0
end
function forEach(arr, cb)
    for ____, i in ipairs(arr) do
        cb(i)
    end
end
function find(arr, cb)
    for ____, i in ipairs(arr) do
        if cb(i) then
            return i
        end
    end
    return nil
end
isDrawTest = false
local myFrame = CreateFrame("Frame")
myFrame:HookScript(
    "OnEvent",
    function()
        print("Setting friendly nameplate size")
        C_NamePlate.SetNamePlateFriendlySize(50, 100)
    end
)
myFrame:RegisterEvent("PLAYER_LOGIN")
iconSize = 25
offsetX = iconSize / 5
frames = {
    player = makeArenaTargetFrames("player"),
    party1 = makeArenaTargetFrames("party1"),
    party2 = makeArenaTargetFrames("party2")
}
opponents = {}
local allUnits = {"player", "party1", "party2"}
local prevDigests = {player = "", party1 = "", party2 = ""}
local updateInterval = 1
C_Timer.NewTicker(
    updateInterval,
    function()
        local checkUnit, targetted_by, unitGuids
        function checkUnit(tar)
            local target = UnitGUID(tar .. "target")
            if target ~= nil then
                print((tar .. " is targetting ") .. target)
                forEach(
                    allUnits,
                    function(unit)
                        if target == unitGuids[unit] then
                            local ____targetted_by_unit_0 = targetted_by[unit]
                            ____targetted_by_unit_0[#____targetted_by_unit_0 + 1] = tar
                        end
                    end
                )
            end
        end
        local isArena, isRated = IsActiveBattlefieldArena()
        if not isArena and not isDrawTest then
            return
        end
        targetted_by = {player = isDrawTest and ({"arena1", "arena2", "arena3"}) or ({}), party1 = isDrawTest and ({"arena1", "arena2", "arena3"}) or ({}), party2 = isDrawTest and ({"arena1", "arena2", "arena3"}) or ({})}
        unitGuids = {
            player = UnitGUID("player"),
            party1 = UnitGUID("party1"),
            party2 = UnitGUID("party2")
        }
        checkUnit("arena1")
        checkUnit("arena2")
        checkUnit("arena3")
        forEach(
            allUnits,
            function(unit)
                local unit_being_targetted_by = targetted_by[unit]
                local prevDigest = prevDigests[unit]
                local digest = join(unit_being_targetted_by)
                if prevDigest ~= digest then
                    print((("Redrawing " .. unit) .. " - ") .. digest)
                    redraw(unit, unit_being_targetted_by)
                    prevDigests[unit] = digest
                end
            end
        )
    end
)
local initFrame = CreateFrame("Frame")
initFrame:RegisterEvent("ARENA_PREP_OPPONENT_SPECIALIZATIONS")
initFrame:HookScript("OnEvent", init)
init()
local function compact(arr)
    local n = {}
    for ____, i in ipairs(arr) do
        if i ~= nil then
            n[#n + 1] = i
        end
    end
    return n
end
return ____exports
