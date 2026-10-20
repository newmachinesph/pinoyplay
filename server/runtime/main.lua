local nk = require("nakama")

-- Casual, client-reported leaderboards. Never use these for prizes or trusted competition.
-- Before ranked/competitive play, replace client writes with authoritative run validation.
for _, game in ipairs({
  "jeepney-rush", "patintero", "tricycle-parking", "island-boat-racing",
  "tumbang-preso", "basketball-sa-kanto", "piko-challenge", "halo-halo-shop",
  "coconut-catcher", "volcano-escape"
}) do
  nk.leaderboard_create(game, false, "desc", "best", nil, {difficulty = "normal"})
  for _, difficulty in ipairs({"easy", "hard"}) do
    nk.leaderboard_create(game .. "-" .. difficulty, false, "desc", "best", nil, {difficulty = difficulty})
  end
end
nk.logger_info("PinoyPlay casual leaderboards ready.")
