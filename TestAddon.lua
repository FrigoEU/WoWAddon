--[[ Generated with https://github.com/TypeScriptToLua/TypeScriptToLua ]]
local ____exports = {}
local makeArenaTargetFrame, makeTargettingDigest, redraw, init, initOpponent, is_x_targetting_y, waitForFrame, compact, forEach, find, iconSize, frames, opponents
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
function makeTargettingDigest(tars)
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
    if not IsActiveBattlefieldArena then
        return
    end
    opponents = {
        initOpponent("arena1"),
        initOpponent("arena2"),
        initOpponent("arena3")
    }
    NotifyInspect("arena1")
    NotifyInspect("arena2")
    NotifyInspect("arena3")
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
    return {specIcon = nil, tar = tar}
end
function is_x_targetting_y(tar, unit)
    local u = UnitGUID(unit)
    local t = UnitGUID(tar .. "target")
    return u == t
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
function compact(arr)
    local n = {}
    do
        local i = 0
        while true do
            local ____i_0 = i
            i = ____i_0 + 1
            if not ____i_0 then
                break
            end
            if arr[i + 1] ~= nil then
                n[#n + 1] = arr[i + 1]
            end
            local ____ = i < #arr
        end
    end
    return n
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
local myFrame = CreateFrame("Frame")
myFrame:HookScript(
    "OnEvent",
    function()
        print("Setting friendly nameplate size")
        C_NamePlate.SetNamePlateFriendlySize(50, 100)
    end
)
myFrame:RegisterEvent("PLAYER_LOGIN")
iconSize = 28
local offsetX = iconSize + iconSize / 4
frames = {
    player = {
        makeArenaTargetFrame("player", 0),
        makeArenaTargetFrame("player", -offsetX),
        makeArenaTargetFrame("player", -offsetX * 2)
    },
    party1 = {
        makeArenaTargetFrame("party1", 0),
        makeArenaTargetFrame("party1", -offsetX),
        makeArenaTargetFrame("party1", -offsetX * 2)
    },
    party2 = {
        makeArenaTargetFrame("party2", 0),
        makeArenaTargetFrame("party2", -offsetX),
        makeArenaTargetFrame("party2", -offsetX * 2)
    }
}
opponents = {}
local isDrawTest = true
local prevDigests = {player = "", party1 = "", party2 = ""}
C_Timer.NewTicker(
    0.25,
    function()
        local checkUnit
        function checkUnit(unit)
            local unit_being_targetted_by = isDrawTest and ({"arena1", "arena3"}) or compact({
                is_x_targetting_y("arena1", unit) and "arena1" or nil,
                is_x_targetting_y("arena2", unit) and "arena2" or nil,
                is_x_targetting_y("arena3", unit) and "arena3" or nil
            })
            local prevDigest = prevDigests[unit]
            local digest = makeTargettingDigest(unit_being_targetted_by)
            if prevDigest ~= digest then
                redraw(unit, unit_being_targetted_by)
                prevDigests[unit] = digest
            end
        end
        local isArena, isRated = IsActiveBattlefieldArena()
        if not isArena and not isDrawTest then
            return
        end
        checkUnit("player")
        checkUnit("party1")
        checkUnit("party2")
    end
)
local initOpponentsFrame = CreateFrame("Frame")
initOpponentsFrame:RegisterEvent("ARENA_PREP_OPPONENT_SPECIALIZATIONS")
initOpponentsFrame:HookScript("OnEvent", init)
init()
local inspectFrame = CreateFrame("Frame")
inspectFrame:RegisterEvent("INSPECT_READY")
inspectFrame:HookScript(
    "OnEvent",
    function()
        for ____, opp in ipairs(opponents) do
            if opp.specIcon == nil then
                local specId = GetInspectSpecialization(opp.tar)
                if specId > 0 then
                    local _id, _n, _d, icon2 = GetSpecializationInfoByID(specId)
                    opp.specIcon = icon2
                end
            end
        end
    end
)
return ____exports
