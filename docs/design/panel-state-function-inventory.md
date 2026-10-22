# Panel state function inventory

Generated from the branch source on 2026-10-22 using the TypeScript parser.

1145 named implementations and inline route registrations across 111 files.
Includes nested named helpers, function-valued properties and class methods; excludes
anonymous non-route callbacks and type-only signatures. A route registration may contain
several middleware callbacks. Line numbers refer to this proposal's base source.

This is the migration navigation inventory for [the design](panel-state-redesign.md).
It does not certify that every listed function has been behaviorally audited.
The design's findings identify the bodies/paths inspected for specific issues.
Files are grouped by proposed ownership; pure formatting/helpers generally stay in place.
Adjacent account, transport, plugin loading, notification and media internals are
outside this lifecycle inventory and still require caller checks when their contracts change.

## Core lifecycle and scheduling

Centralize transitions, eligibility and recoverable effects.

### api/src/core/allocationQueue.ts

- `matchBracketOf` — line 30
- `queueStage` — line 52
- `bracketRank` — line 61
- `compareQueueOrder` — line 70
- `isQueueable` — line 98
- `checkQueueTurn` — line 122
- `withoutBusyTeams` — line 154
- `batchServerTarget` — line 193

### api/src/core/matchChangeBus.ts

- `onMatchChanged` — line 26
- `matchChanged` — line 31

### api/src/core/matchLifecycle.ts

- `ingest` — line 81
- `matchBySlug` — line 147
- `matchByIdOrSlug` — line 154
- `releaseMatch` — line 168
- `handleMapCompletion` — line 178
- `isEliminationMatch` — line 300
- `teamDamage` — line 309
- `decideLevelSeries` — line 317
- `awaitAdminDecision` — line 339
- `finishExhaustedSeries` — line 377
- `setSeriesWinnerByAdmin` — line 419
- `applySeriesResult` — line 467
- `recordGames` — line 510
- `recordResultSource` — line 539
- `knownTeamNames` — line 565
- `lastPlayedMapIndex` — line 600
- `processSeriesEnd` — line 619
- `checkAndAdvanceShuffleRound` — line 949

### api/src/core/missingModule.ts

- `constructor` — line 31
- `moduleNotInstalledMessage` — line 37
- `nameFrom` — line 41
- `describeUnknownConfig` — line 54
- `missingModuleIntegration` — line 76
- `statsSchema` — line 92
- `buildMatchConfig` — line 94
- `checkStart` — line 101
- `capacity` — line 106
- `allocate` — line 109
- `restart` — line 112

### api/src/core/playerResults.ts

- `updateRatingsForMatch` — line 29
- `seriesStatsFor` — line 90
- `persistPlayerMatchStats` — line 105
- `lineFor` — line 142
- `insertRow` — line 153
- `ids` — line 222
- `configHasBotFill` — line 249
- `knownPlayerIds` — line 258
- `trackPlayerStatsForMatch` — line 272
- `trackPlayerStatsForManualMatch` — line 321

### api/src/core/scheduler.ts

- `toMatchAllocationResult` — line 63
- `capacityCount` — line 87
- `integrationForTournament` — line 122
- `getEffectiveGracePeriodSeconds` — line 135
- `getAvailableServerCount` — line 141
- `getAllocationStatus` — line 157
- `getBusyTeamIds` — line 218
- `getReadyMatchRows` — line 231
- `getReadyMatches` — line 254
- `getAllocationQueue` — line 266
- `allocateWave` — line 302
- `allocateServersToMatches` — line 319
- `allocateSpecificMatches` — line 349
- `allocateSingleMatch` — line 417
- `startTournament` — line 547
- `cancelTournament` — line 1010
- `restartTournament` — line 1043
- `endMatchesOnResources` — line 1151
- `checkStart` — line 1189
- `prepareStart` — line 1195
- `resolveBaseUrl` — line 1206
- `resolveBaseUrlForMatch` — line 1212
- `loadMatch` — line 1223
- `restartMatch` — line 1233
- `reallocateMatch` — line 1238
- `cancelMatch` — line 1252
- `allocateReadyMatch` — line 1261
- `scheduleRoundAllocation` — line 1286
- `startPollingForServer` — line 1344
- `stopPollingForServer` — line 1409
- `stopAllPolling` — line 1421
- `rowToMatch` — line 1432
- `tryImmediateAllocation` — line 1477
- `getReadyStandaloneMatchSlugs` — line 1541
- `allocateStandaloneMatches` — line 1559
- `isQueuedAllocationResult` — line 1583

### api/src/services/currentTournament.ts

- `constructor` — line 27
- `featuredTournamentId` — line 36
- `nextTournamentId` — line 67
- `noteTournamentId` — line 82
- `refreshCurrentTournamentId` — line 88
- `startCurrentTournamentRefresh` — line 102
- `stopCurrentTournamentRefresh` — line 108
- `setFeaturedTournament` — line 114
- `archiveTournament` — line 132
- `archiveCurrentTournament` — line 158
- `readableTournamentId` — line 169
- `runningTournamentIds` — line 181

### api/src/services/forgetMatches.ts

- `forgetMatches` — line 20

### api/src/services/matchHolds.ts

- `now` — line 31
- `notHeldSql` — line 37
- `holdOf` — line 51
- `matchHeld` — line 78
- `holdChanged` — line 82
- `openMatchSlugs` — line 99
- `logEvent` — line 113
- `holdMatch` — line 133
- `holdForBreak` — line 159
- `releaseMatch` — line 172
- `restartCountdown` — line 195
- `pauseTournament` — line 214
- `resumeTournament` — line 235
- `allocateSoon` — line 258
- `tickHolds` — line 264
- `startHoldTimer` — line 294
- `stopHoldTimer` — line 302

### api/src/services/matchLiveStatsService.ts

- `mergeStatLines` — line 52
- `sumPlayerStatsAcrossMaps` — line 95
- `sumSide` — line 101
- `getStats` — line 124
- `getStatsDelayed` — line 132
- `reset` — line 139
- `update` — line 159
- `getSeriesPlayerStats` — line 189
- `clear` — line 195
- `clearAll` — line 202

### api/src/services/matchMapResultService.ts

- `recordMapResult` — line 39
- `getMapResults` — line 84
- `clearMapResults` — line 113

### api/src/services/matchRecoveryService.ts

- `recoverActiveMatches` — line 23
- `recoverMatch` — line 64
- `replayRecentEvents` — line 125

### api/src/services/matchService.ts

- `createMatch` — line 25
- `getMatchBySlug` — line 138
- `getMatchById` — line 146
- `getAllMatches` — line 154
- `updateMatchStatus` — line 167
- `deleteMatch` — line 194
- `toResponse` — line 215

### api/src/services/matchTimes.ts

- `matchTimesOf` — line 47
- `minutes` — line 63
- `matchTimesError` — line 74
- `startOfMatch` — line 99
- `vetoOpensOf` — line 109
- `matchTimeFields` — line 115
- `tournamentSettings` — line 124
- `clock` — line 136
- `holdForStartTime` — line 144
- `applyMatchTimes` — line 166
- `matchPlayerIds` — line 204
- `sweepReminders` — line 220
- `startMatchTimes` — line 293
- `run` — line 296

### api/src/services/tournamentSchedule.ts

- `startScheduleOf` — line 42
- `remindersDue` — line 59
- `autoStartDue` — line 68
- `inMinutes` — line 78
- `startTournament` — line 87
- `sweep` — line 120
- `startTournamentSchedule` — line 167
- `run` — line 173

### api/src/services/tournamentService.ts

- `validTeamSize` — line 54
- `initialSlotStatus` — line 68
- `signupIsOpen` — line 88
- `emailSignupOpen` — line 93
- `getTournament` — line 104
- `getTournamentWinner` — line 168
- `resolveTeam` — line 182
- `createTournament` — line 240
- `updateTournament` — line 367
- `deleteTournament` — line 480
- `generateBracket` — line 531
- `regenerateBracket` — line 715
- `resetTournament` — line 742
- `getBracket` — line 840
- `getMatches` — line 885
- `linkMatches` — line 971
- `getTeamsForTournament` — line 1115
- `rowToTournament` — line 1132
- `tournamentWasPlayed` — line 1162

### api/src/utils/matchProgression.ts

- `advanceWinnerToNextMatch` — line 22
- `advanceLoserToLosersBracket` — line 146
- `propagateMatchBySlotSources` — line 264
- `reportTournamentPlacements` — line 371
- `loserOf` — line 413
- `awardTeamPlaces` — line 429
- `awardPlacements` — line 475
- `checkTournamentCompletion` — line 502
- `makeMatchReady` — line 649
- `reconcileDoubleElimination8Bracket` — line 755
- `get` — line 789
- `loserOf` — line 807
- `updateTeamsIfChanged` — line 812
- `maybeMakeReady` — line 840
- `findLosersBracketMatch` — line 938

### api/src/utils/matchStatusHelpers.ts

- `requiresVeto` — line 8
- `determineInitialMatchStatus` — line 23
- `isMatchFinalized` — line 59
- `isEliminationTournamentType` — line 77

## Formats, participants and matchmaking

Retain domain rules; connect results, blockers and explicit origins to the core.

### api/src/services/bracketByes.ts

- `isPowerOfTwo` — line 33
- `nextPowerOfTwo` — line 35
- `padWithByes` — line 47
- `resolveByes` — line 65
- `from` — line 69
- `dead` — line 78
- `dropped` — line 96
- `live` — line 99

### api/src/services/bracketGenerators/index.ts

- `getBracketGenerator` — line 31

### api/src/services/bracketGenerators/types.ts

Contract/export file; no named function implementations.

### api/src/services/groupsTournament.ts

- `groupsSettingsOf` — line 49
- `fmt` — line 55
- `groupsError` — line 67
- `playoffSize` — line 82
- `drawGroups` — line 89
- `groupOf` — line 111
- `generate` — line 118
- `seedOf` — line 151
- `prefix` — line 153
- `groupStandings` — line 181
- `seedPlayoffs` — line 211
- `strength` — line 216
- `better` — line 217
- `advanceGroupsTournament` — line 262
- `advanceOnce` — line 271

### api/src/services/matchLineups.ts

- `constructor` — line 35
- `parseJson` — line 95
- `poolFromRoster` — line 105
- `fillLineup` — line 137
- `tournamentRow` — line 150
- `teamRow` — line 160
- `sizeFor` — line 171
- `hasLineups` — line 187
- `pool` — line 194
- `storedLineup` — line 203
- `resolve` — line 223
- `lineupFor` — line 245
- `mayActFor` — line 266
- `lineupsOpen` — line 281
- `matchRow` — line 293
- `getMatchLineups` — line 299
- `setMatchLineup` — line 329

### api/src/services/matchmaking/mapFromMatch.ts

- `mapFromMatch` — line 6

### api/src/services/matchmaking/matchmakingService.ts

- `constructor` — line 68
- `inviteKey` — line 137
- `matchmakingSides` — line 222
- `constructor` — line 264
- `touch` — line 269
- `locked` — line 274
- `wrapped` — line 275
- `partyOf` — line 297
- `partyGame` — line 307
- `members` — line 315
- `touchParty` — line 324
- `entryOf` — line 328
- `newParty` — line 334
- `createParty` — line 353
- `joinParty` — line 360
- `enter` — line 376
- `invite` — line 432
- `cancelInvite` — line 501
- `answerInvite` — line 517
- `inTournament` — line 556
- `notReady` — line 582
- `invitesTo` — line 590
- `setPartyMode` — line 619
- `leaveParty` — line 651
- `leave` — line 659
- `cooldownUntil` — line 685
- `startSearch` — line 695
- `stopSearch` — line 784
- `enabledModes` — line 801
- `tick` — line 808
- `searchingParties` — line 831
- `formLobby` — line 858
- `lobbyFor` — line 900
- `accept` — line 918
- `decline` — line 953
- `startMatch` — line 982
- `team` — line 1015
- `voteRematch` — line 1101
- `settleRematch` — line 1150
- `decline` — line 1174
- `settleExpiredRematches` — line 1246
- `rematchView` — line 1266
- `rematchFor` — line 1313
- `watchPresence` — line 1336
- `penalizeAbandon` — line 1399
- `ratingsFor` — line 1419
- `applyMatchResult` — line 1456
- `write` — line 1505
- `resolveTimeout` — line 1543
- `cancel` — line 1560
- `penalize` — line 1577
- `clearCooldown` — line 1596
- `me` — line 1609
- `searchWindowSettings` — line 1690
- `waitEstimates` — line 1705
- `modeRules` — line 1726
- `name` — line 1731
- `people` — line 1738
- `matchCounts` — line 1758
- `queueCounts` — line 1768
- `ratingSummary` — line 1777
- `lobbyView` — line 1791
- `sideOf` — line 1889
- `publicQueue` — line 1931
- `lobby` — line 1968
- `adminQueue` — line 1988
- `nameOf` — line 2016
- `serversReservedForMatchmaking` — line 2092
- `start` — line 2106
- `stop` — line 2122

### api/src/services/matchmaking/playedMap.ts

- `playedMapOf` — line 9

### api/src/services/matchmaking/progression.ts

- `xpForMatch` — line 33
- `levelFor` — line 58
- `parseCommend` — line 88

### api/src/services/matchmaking/progressionService.ts

- `constructor` — line 23
- `now` — line 31
- `startOfUtcDay` — line 32
- `lobbyPlayersOfMatch` — line 39
- `addXp` — line 48
- `awardMatchXp` — line 75
- `totalOf` — line 105
- `awardPlacementXp` — line 161
- `progress` — line 173
- `commend` — line 207
- `result` — line 241
- `leaderboard` — line 360
- `history` — line 407
- `reviewList` — line 479
- `adjustXp` — line 522

### api/src/services/matchmaking/rules.ts

- `parseModePools` — line 20
- `parseEnabledModes` — line 39
- `isMode` — line 54
- `cooldownSeconds` — line 71
- `abandonCooldownSeconds` — line 80
- `isAbandon` — line 94
- `everyoneGone` — line 112
- `rematchOpen` — line 123
- `teamRematchAnswer` — line 141
- `rematchOutcome` — line 156
- `findBotFillGroup` — line 198
- `splitBotFill` — line 215
- `size` — line 220
- `parseSearchWindow` — line 266
- `num` — line 274
- `validateSearchWindow` — line 294
- `int` — line 298
- `searchWindow` — line 312
- `partyRating` — line 330
- `compatible` — line 338
- `fewSearching` — line 358
- `findGroup` — line 363
- `pickExact` — line 387
- `splitTeams` — line 410
- `score` — line 431
- `side` — line 432
- `sum` — line 436
- `inviteCode` — line 459
- `freeForTournament` — line 472
- `parseReservedServers` — line 482
- `pickCaptain` — line 493
- `at` — line 499

### api/src/services/playerModeration.ts

- `now` — line 35
- `moderationOf` — line 46
- `forget` — line 58
- `endSessions` — line 63
- `captainsOf` — line 78
- `openMatches` — line 91
- `leaveLineups` — line 105
- `openGaps` — line 162
- `lineupPicked` — line 171
- `resolveDueGaps` — line 184
- `constructor` — line 220
- `banPlayer` — line 228
- `unbanPlayer` — line 247
- `isDeleted` — line 260
- `deletePlayer` — line 294
- `blockedViewerMiddleware` — line 348

### api/src/services/shuffleTournamentService.ts

- `createShuffleTournament` — line 103
- `registerPlayers` — line 187
- `getRegisteredPlayers` — line 266
- `setRegisteredPlayers` — line 307
- `botFillTeamCount` — line 403
- `generateRoundMatches` — line 413
- `insertRoundMatches` — line 506
- `benchTooLate` — line 648
- `fillRoundFromBench` — line 663
- `checkRoundCompletion` — line 751
- `breakAfterRound` — line 792
- `valid` — line 803
- `holdRoundForBreak` — line 815
- `advanceToNextRound` — line 836
- `getPlayerLeaderboard` — line 951
- `getTournamentLeaderboard` — line 1050
- `getShuffleTournament` — line 1390
- `dropShuffleNoShows` — line 1418
- `noticeNoShows` — line 1478
- `cancelEmptyShuffleMatch` — line 1508
- `bringBackLateJoiner` — line 1531

### api/src/services/standardBracketGenerator.ts

- `applyOrdering` — line 35
- `dropInOrder` — line 59
- `constructor` — line 80
- `generate` — line 88
- `mapTournamentType` — line 251
- `convertMatches` — line 270
- `generateSlug` — line 401
- `reset` — line 428
- `generateWithByes` — line 440
- `generatePowerOfTwoDoubleElimination` — line 478
- `generatePowerOfTwoSingleElimination` — line 729

### api/src/services/swissBracketGenerator.ts

- `shuffleArray` — line 8
- `generate` — line 20

### api/src/services/swissProgressionService.ts

- `loadSwissMatches` — line 40
- `toSwissMatch` — line 57
- `parseTeamIds` — line 68
- `getSwissStandings` — line 78
- `getSwissStandingEntries` — line 89
- `advanceSwissTournament` — line 111
- `advanceOnce` — line 119

### api/src/services/tournamentSignupService.ts

- `constructor` — line 27
- `parse` — line 88
- `windowOf` — line 96
- `iso` — line 98
- `isPast` — line 108
- `loadTournament` — line 112
- `gameRowId` — line 122
- `teamRow` — line 130
- `rosterSteamIds` — line 146
- `requireCaptain` — line 151
- `validateLineup` — line 163
- `rejectBlocked` — line 183
- `rejectOtherLineups` — line 199
- `writeLineup` — line 219
- `setTeamIds` — line 243
- `window` — line 267
- `registrations` — line 272
- `eligibleTeams` — line 419
- `remind` — line 492
- `shufflePlayers` — line 533
- `joinShuffle` — line 572
- `leaveShuffle` — line 628
- `register` — line 654
- `changeLineup` — line 696
- `withdraw` — line 728
- `adminAdd` — line 759
- `adminRemove` — line 774
- `dropRemovedTeams` — line 790
- `checkIn` — line 800
- `lineupRoster` — line 839

## Core API boundaries and contracts

Project common facts; preserve authorization, scope and legacy responses.

### api/src/integrations/types.ts

Contract/export file; no named function implementations.

### api/src/routes/matches.ts

- `getMatchDetailsBySlug` — line 60
- `router.get('/:slug.json')` — line 396
- `router.delete('/:slug')` — line 506
- `router.post('/bulk-delete')` — line 555
- `router.get('/')` — line 623
- `router.get('/played')` — line 966
- `configName` — line 1015
- `router.get('/:slug')` — line 1081
- `teamOf` — line 1131
- `router.post('/')` — line 1209
- `router.post('/:slug/load')` — line 1291
- `router.post('/:slug/restart')` — line 1345
- `actorOf` — line 1386
- `holdMinutes` — line 1392
- `router.put('/:slug/start-time')` — line 1403
- `router.put('/:slug/on-stage')` — line 1428
- `router.get('/:slug/hold')` — line 1447
- `router.post('/:slug/hold')` — line 1458
- `router.delete('/:slug/hold')` — line 1484
- `seriesScore` — line 1495
- `router.post('/:slug/maps/:map/result')` — line 1534
- `score` — line 1538
- `router.post('/:slug/restart-countdown')` — line 1623
- `router.post('/:slug/reallocate')` — line 1640
- `router.patch('/:slug/status')` — line 1710
- `router.post('/:slug/winner')` — line 1751
- `router.post('/:slug/force-cancel')` — line 1780

### api/src/routes/players.ts

- `actorOf` — line 50
- `router.get('/presence')` — line 115
- `router.get('/find')` — line 136
- `router.get('/public-selection')` — line 253
- `router.get('/selection')` — line 303
- `router.get('/:playerId/team')` — line 350
- `parsePlayers` — line 381
- `onIt` — line 447
- `matchNowPath` — line 506
- `router.get('/me/match-now')` — line 557
- `router.get('/me/match-status')` — line 573
- `sideOf` — line 672
- `resolveSelfServiceSteamId` — line 870
- `router.get('/me/discord-id')` — line 895
- `router.put('/me/discord-id')` — line 924
- `router.put('/me/shown-team')` — line 982
- `router.get('/:playerId/current-match')` — line 1024
- `enrichPlayers` — line 1346
- `router.get('/:playerId/summary')` — line 1580
- `router.get('/:playerId/avatar.svg')` — line 1794
- `router.get('/:playerId')` — line 1819
- `router.get('/:playerId/rating-history')` — line 1849
- `router.get('/:playerId/matches')` — line 1877
- `router.post('/import')` — line 1946
- `router.get('/:playerId/accounts')` — line 1971
- `applyAccounts` — line 1976
- `router.get('/')` — line 2002
- `router.get('/by-discord-id/:discordId')` — line 2033
- `router.post('/')` — line 2055
- `router.post('/bulk-import')` — line 2138
- `router.post('/bulk-delete')` — line 2186
- `router.put('/:playerId')` — line 2247
- `router.post('/:playerId/ban')` — line 2320
- `router.delete('/:playerId/ban')` — line 2341
- `router.delete('/:playerId')` — line 2360
- `importPlayers` — line 2394

### api/src/routes/teamMatch.ts

- `getViewerSteamId` — line 54
- `router.get('/:teamId/match')` — line 64
- `enrichPlayers` — line 401
- `normalizeLiveStatsForTeamView` — line 598

### api/src/routes/tournament.ts

- `router.get('/current-id')` — line 78
- `router.post('/archive')` — line 103
- `router.get('/:id/teams')` — line 155
- `router.get('/:id/leaderboard')` — line 224
- `router.get('/allocation-status')` — line 268
- `router.get('/game')` — line 324
- `nextRoundEtaFor` — line 343
- `router.get('/:id/bracket')` — line 440
- `router.get('/:id/shuffle-round')` — line 470
- `ids` — line 505
- `router.get('/:id/pause')` — line 537
- `router.get('/:id/banner')` — line 582
- `router.put('/banner')` — line 636
- `router.delete('/banner')` — line 649
- `bannerAction` — line 654
- `router.get('/')` — line 690
- `validateGameSettings` — line 855
- `validateEventPageSettings` — line 877
- `router.post('/')` — line 1051
- `router.put('/')` — line 1226
- `router.delete('/')` — line 1309
- `router.get('/bracket')` — line 1384
- `router.post('/bracket/regenerate')` — line 1441
- `router.post('/reset')` — line 1480
- `router.get('/server-availability')` — line 1573
- `router.post('/pause')` — line 1604
- `router.post('/resume')` — line 1630
- `router.post('/start')` — line 1641
- `router.post('/cancel')` — line 1846
- `router.post('/restart')` — line 1868
- `router.post('/wipe-database')` — line 1932
- `router.post('/wipe-table/:table')` — line 1985
- `router.post('/dev/reset-simulation-state')` — line 2098
- `router.post('/shuffle')` — line 2236
- `router.post('/:id/manual-matches')` — line 2314
- `resolveMaxRounds` — line 2370
- `generateSlug` — line 2399
- `toMatchPlayers` — line 2532
- `router.post('/:id/register-players')` — line 2668
- `router.put('/:id/set-players')` — line 2748
- `router.get('/:id/players')` — line 2817
- `router.get('/:id/round-status')` — line 2869
- `router.post('/:id/generate-round')` — line 2902
- `router.get('/:id/elo-template')` — line 2942
- `router.put('/:id/elo-template')` — line 2978
- `router.post('/:id/check-completion')` — line 3020

### api/src/routes/tournamentSignup.ts

- `idList` — line 23
- `signupAction` — line 28

### api/src/types/database.types.ts

Contract/export file; no named function implementations.

### api/src/types/match.types.ts

Contract/export file; no named function implementations.

### api/src/types/tournament.types.ts

Contract/export file; no named function implementations.

## CS2 integration

Keep protocol and game rules; isolate observations/assignment from core lifecycle writes.

### api/src/integrations/cs2/allocation.ts

- `serverCooldownSeconds` — line 126
- `getEffectiveGracePeriodSeconds` — line 140
- `getFreeServerCount` — line 152
- `getPoolStatus` — line 165
- `getAvailableServers` — line 346
- `availableFleetServers` — line 404
- `allocateMatchToServerOnce` — line 464
- `emitServerAssigned` — line 592
- `allocateBatch` — line 614
- `allocate` — line 657
- `allocateTo` — line 674
- `allocateOnce` — line 680
- `restartMatch` — line 802
- `loadAssigned` — line 930
- `moveToOtherServer` — line 991
- `endMatchOnServer` — line 1051
- `restartServerToEndMatch` — line 1061
- `markIdle` — line 1072
- `seriesDone` — line 1080

### api/src/integrations/cs2/events/matchEvents.ts

- `isStaleMapEvent` — line 35
- `shouldAcceptPlayEvent` — line 69
- `updateMatchStatus` — line 89
- `determinePlayerTeam` — line 108
- `playerMatchesCollection` — line 150
- `steamIdOf` — line 171
- `updateLiveStats` — line 187
- `extractPlayerStatsFromEvent` — line 195
- `buildTeam` — line 201
- `pick` — line 217
- `parseNumber` — line 262
- `liveStatusForPhase` — line 281
- `liveLineFromMetrics` — line 304
- `applyNormalizedEvents` — line 340
- `matchFor` — line 346
- `statsFromLines` — line 526
- `seriesPlayerStats` — line 557

### api/src/integrations/cs2/fleet/driver.ts

- `nowS` — line 135
- `fromRow` — line 137
- `getAssignment` — line 155
- `openAssignmentsOf` — line 164
- `saveAssignment` — line 172
- `storeAckedConfig` — line 203
- `markEnded` — line 217
- `connectPasswordFor` — line 228
- `fleetServerStatus` — line 264
- `fleetServerIsIdle` — line 313
- `servedMatchConfig` — line 349
- `assignConfigPreview` — line 363
- `streamsDemos` — line 384
- `joinPasswordEnabled` — line 397
- `isTeamReadyMatch` — line 411
- `assignDefaults` — line 421
- `refusal` — line 443
- `serverIsSilent` — line 467
- `assignMatch` — line 475
- `unassignEpoch` — line 620
- `unassignMatch` — line 648
- `unassignAll` — line 673
- `withHold` — line 696
- `updateMatch` — line 714
- `syncMatch` — line 761
- `addPlayer` — line 793
- `runFleetCommand` — line 855
- `currentPosition` — line 943
- `execOnFleetServer` — line 962
- `supersede` — line 1000
- `fenceEpoch` — line 1026
- `resolveWelcomeAssignment` — line 1037
- `checkHello` — line 1056
- `triggerAllocation` — line 1085
- `onFleetEvent` — line 1097
- `startFleetDriver` — line 1226

### api/src/integrations/cs2/fleet/failover.ts

- `nowS` — line 155
- `num` — line 156
- `parseJson` — line 159
- `fromRow` — line 168
- `getProposal` — line 199
- `activeProposal` — line 208
- `listProposals` — line 216
- `recentMove` — line 225
- `savedState` — line 237
- `setStatus` — line 250
- `announce` — line 261
- `parseCaps` — line 285
- `parseBuild` — line 290
- `serverChoices` — line 315
- `freeFleetServers` — line 357
- `serverTraits` — line 386
- `scanForFailovers` — line 432
- `withdraw` — line 440
- `runScan` — line 447
- `autoAccept` — line 588
- `mapsOf` — line 612
- `createProposal` — line 621
- `refuse` — line 741
- `writeAudit` — line 751
- `settleAudit` — line 766
- `acceptFailover` — line 784
- `moveMatch` — line 994
- `dismissFailover` — line 1039
- `onServerBack` — line 1064
- `openAssignments` — line 1075
- `onHostHealth` — line 1125
- `scheduleScan` — line 1147
- `healthListener` — line 1158
- `startFleetFailover` — line 1165
- `stopFleetFailover` — line 1195

### api/src/integrations/cs2/fleet/failoverPlan.ts

- `failoverGraceFromEnv` — line 24
- `read` — line 25
- `graceSecondsFor` — line 40
- `detectFailure` — line 78
- `pickBackup` — line 108
- `pickTarget` — line 135
- `rank` — line 151
- `buildResume` — line 179
- `effectiveReserve` — line 218
- `pickReserved` — line 224

### api/src/integrations/cs2/fleet/failoverRecovery.ts

- `envNum` — line 33
- `csmRecoveryEnabled` — line 40
- `restartWaitS` — line 44
- `restartCooldownS` — line 45
- `createsPerHour` — line 46
- `createMinFreeMb` — line 47
- `nowS` — line 49
- `resetRecoveryState` — line 67
- `audit` — line 72
- `note` — line 85
- `locate` — line 95
- `lastRestartAt` — line 106
- `restartBeforeMove` — line 122
- `hostsWithRoom` — line 196
- `createWhenNoneFree` — line 214
- `linkCreatedServers` — line 250

### api/src/integrations/cs2/fleet/normalize.ts

- `toPlatformMapNumber` — line 66
- `toFleetMapNumber` — line 71
- `isDevBotId` — line 76
- `steam` — line 85
- `teamOf` — line 89
- `playerName` — line 95
- `metricsFromFleetStats` — line 102
- `totalsFromRounds` — line 122
- `roundLines` — line 161
- `phaseChanged` — line 177
- `scoreUpdated` — line 181
- `normalizeFleetEvent` — line 214

### api/src/integrations/cs2/fleet/state.ts

- `isRevOnly` — line 114
- `withRev` — line 119
- `nowS` — line 127
- `emptyRecord` — line 129
- `constructor` — line 158
- `getLiveState` — line 165
- `listForServer` — line 170
- `onLiveStateChange` — line 175
- `beginAssignment` — line 187
- `setConfigRev` — line 199
- `applySnapshot` — line 213
- `applyPatch` — line 303
- `hold` — line 314
- `recordRound` — line 371
- `voidRounds` — line 398
- `heldCount` — line 423
- `loadRecord` — line 430
- `emit` — line 441
- `locked` — line 459
- `isLeftOver` — line 502
- `parse` — line 512
- `fromRow` — line 521
- `createPostgresLiveStatePersistence` — line 547
- `load` — line 549
- `save` — line 556
- `allocateEpoch` — line 580
- `listByServer` — line 594
- `createMemoryLiveStatePersistence` — line 606
- `copy` — line 610
- `load` — line 614
- `save` — line 618
- `allocateEpoch` — line 621
- `listByServer` — line 632
- `getLiveState` — line 642

### api/src/integrations/cs2/index.ts

- `resolveTournament` — line 78
- `describeTeam` — line 98
- `toAllocateResult` — line 114
- `toResourceActionResult` — line 131
- `vetoOn` — line 138
- `vetoCompleted` — line 143
- `usesVeto` — line 153
- `statsSchema` — line 184
- `readInstanceSettings` — line 187
- `buildMatchConfig` — line 192
- `describeMatch` — line 217
- `isReadyToAllocate` — line 243
- `fillsShortTeams` — line 254
- `usesPreMatchPhase` — line 257
- `onMatchReady` — line 266
- `validateTournamentSettings` — line 305
- `seed` — line 323
- `preMatchTurn` — line 334
- `startPendingPreMatchPhases` — line 346
- `capacity` — line 355
- `allocate` — line 362
- `allocateBatch` — line 367
- `restart` — line 381
- `load` — line 404
- `cancel` — line 421
- `release` — line 437
- `poolStatus` — line 449
- `configuredResourceCount` — line 478
- `matchmakingMapPool` — line 498
- `parseIds` — line 501
- `matchmakingPools` — line 565
- `turnoverSeconds` — line 583
- `resourceStatus` — line 589
- `tournamentPlayerExtras` — line 600
- `seriesPlayerStats` — line 605
- `standaloneRoster` — line 625
- `steamIds` — line 635
- `onMatchmakingResult` — line 653
- `siteSearch` — line 677
- `onLevelUp` — line 681
- `forgetMatches` — line 691
- `onTournamentPlacements` — line 720
- `legacyRoutes` — line 758
- `start` — line 766
- `stop` — line 771
- `healthContributions` — line 777
- `connectInfo` — line 789
- `onHoldChanged` — line 814
- `lineupSize` — line 828
- `betweenMaps` — line 833
- `onLineupChanged` — line 840
- `hostedElsewhere` — line 860

### api/src/integrations/cs2/routes/manageMatch.ts

- `logEntryOf` — line 61
- `router.get('/matches/:slug/manage')` — line 123
- `router.post('/matches/:slug/manage/command')` — line 300
- `router.get('/matches/:slug/manage/servers')` — line 373
- `router.post('/matches/:slug/manage/allocate')` — line 406
- `router.post('/matches/:slug/manage/restart-server')` — line 450

### api/src/integrations/cs2/routes/matchConnect.ts

- `isFinishedMatchStatus` — line 50
- `viewerCurrentMatchSlug` — line 58
- `backOnServer` — line 81
- `viewerOnServer` — line 91
- `connectModeOf` — line 105
- `serverStatus` — line 127
- `pickedMaps` — line 153
- `connectIp` — line 175
- `router.get('/matches/:slug/connect')` — line 187
- `at` — line 224

### api/src/integrations/cs2/routes/matchPage.ts

- `num` — line 55
- `line` — line 57
- `sum` — line 58
- `teams` — line 78
- `router.get('/matches/:slug/scoreboard')` — line 89
- `router.get('/matches/:slug/highlights')` — line 110

### api/src/integrations/cs2/veto/announce.ts

- `announceVetoOpen` — line 15

### api/src/integrations/cs2/veto/break.ts

- `holdForMatchBreak` — line 15
- `vetoOpenedAfterHold` — line 50

### api/src/integrations/cs2/veto/chatLines.ts

- `teamNames` — line 24
- `postVetoProgress` — line 36
- `postVetoStarted` — line 64

### api/src/integrations/cs2/veto/config.ts

- `validateVetoOrder` — line 77
- `getVetoOrder` — line 297
- `other` — line 330
- `standardVetoOrder` — line 345
- `validateCustomVetoOrderSetting` — line 391

### api/src/integrations/cs2/veto/context.ts

- `getVetoContext` — line 32
- `resolveCurrentVetoTurn` — line 73

### api/src/integrations/cs2/veto/lock.ts

- `withVetoLock` — line 10

### api/src/integrations/cs2/veto/routes.ts

- `vetoMapInfo` — line 49
- `getViewerSteamId` — line 64
- `normalizeTeamRosterPlayers` — line 69
- `resolveViewerTeamForMatch` — line 93
- `router.get('/:matchSlug')` — line 201
- `router.post('/:matchSlug/action')` — line 374
- `vetoAction` — line 378
- `router.post('/:matchSlug/reset')` — line 865

### api/src/integrations/cs2/veto/simulation.ts

- `getRandomElement` — line 88
- `autoCompleteVetoForMatch` — line 101
- `storedVetoStatus` — line 130
- `isVetoCompleted` — line 141
- `autoVetoPendingMatches` — line 157
- `runAutoVeto` — line 208

### api/src/integrations/cs2/veto/standaloneConfig.ts

- `storeStandaloneVetoConfig` — line 15

### api/src/integrations/cs2/veto/timer.ts

- `markEarlyRelease` — line 39
- `parseVeto` — line 55
- `turnStartedAt` — line 69
- `secondsForTurn` — line 96
- `heldUntil` — line 109
- `vetoTurnDeadline` — line 123
- `vetoWaitingOnHold` — line 164
- `openVetoMatches` — line 173
- `tournamentVetoMatches` — line 188
- `stepOf` — line 208
- `tick` — line 213
- `startVetoTimer` — line 242
- `stopVetoTimer` — line 252

### api/src/integrations/cs2/veto/types.ts

Contract/export file; no named function implementations.

### api/src/integrations/cs2/veto/vote.ts

- `isVoteVeto` — line 20
- `tallyVotes` — line 28
- `sidesOf` — line 50
- `ids` — line 54
- `votersOf` — line 62

## Manual reporting integration

Preserve report revisions, actor checks and validation; delegate lifecycle commits to core.

### api/src/integrations/manual-report/http.ts

- `answer` — line 41
- `matchForRequest` — line 54
- `viewerForMatch` — line 90
- `adminActor` — line 123
- `guarded` — line 129
- `tournamentForRequest` — line 152
- `readRevision` — line 169
- `teamRosters` — line 201
- `teamNames` — line 232

### api/src/integrations/manual-report/index.ts

- `readTeam` — line 103
- `rosterOf` — line 115
- `describeTeam` — line 134
- `setLive` — line 150
- `statsSchema` — line 187
- `validateTournamentSettings` — line 191
- `buildMatchConfig` — line 195
- `describeMatch` — line 225
- `capacity` — line 240
- `allocate` — line 244
- `load` — line 249
- `restart` — line 259
- `cancel` — line 264
- `release` — line 268
- `legacyRoutes` — line 272
- `start` — line 313
- `stop` — line 318
- `positiveOr` — line 324

### api/src/integrations/manual-report/reportRoutes.ts

- `manualReportRoutes.get('/matches/:slug')` — line 78
- `manualReportRoutes.post('/matches/:slug/report')` — line 155
- `run` — line 200
- `run` — line 211
- `run` — line 223
- `manualReportRoutes.get('/tournaments/:tournamentId/stats')` — line 275

### api/src/integrations/manual-report/reports.ts

- `fail` — line 132
- `now` — line 137
- `parseResult` — line 143
- `toReport` — line 164
- `listReports` — line 189
- `openReport` — line 198
- `confirmedReport` — line 208
- `matchFor` — line 218
- `configOf` — line 234
- `isManualReportMatch` — line 251
- `reportingRules` — line 271
- `revisionMismatch` — line 296
- `resolveActor` — line 314
- `otherSide` — line 335
- `validateResult` — line 346
- `recordAction` — line 440
- `reportById` — line 463
- `supersedeOpen` — line 472
- `announce` — line 482
- `toSeriesResult` — line 500
- `finalize` — line 525
- `parkForAdmin` — line 546
- `submitReport` — line 581
- `confirmReport` — line 665
- `disputeReport` — line 704
- `withdrawReport` — line 753
- `mayAnswer` — line 788
- `adminResolve` — line 824
- `adminOverride` — line 868
- `writeAdminResult` — line 887
- `checkStats` — line 953
- `reopenMatch` — line 981
- `sweepTimeouts` — line 1138
- `autoConfirm` — line 1172
- `escalate` — line 1196

### api/src/integrations/manual-report/routes.ts

- `isEnabled` — line 64
- `manualReportTestRoutes.post('/tournament')` — line 78
- `manualReportTestRoutes.post('/teams/:teamId/captain')` — line 170
- `answer` — line 199
- `actorFor` — line 211
- `matchOr404` — line 217
- `manualReportTestRoutes.get('/:slug/reports')` — line 229
- `run` — line 251
- `run` — line 263
- `run` — line 267
- `run` — line 276
- `run` — line 280
- `run` — line 290
- `run` — line 298
- `manualReportTestRoutes.post('/sweep')` — line 328
- `manualReportTestRoutes.post('/:slug/deadline')` — line 337

### api/src/integrations/manual-report/sweeper.ts

- `sweepOnce` — line 30
- `start` — line 54
- `stop` — line 65
- `isRunning` — line 73

## Client state and presentation

Consume common activity/actions; retain module details and transient UI state.

### client/src/components/home/nextMatchState.ts

- `clock` — line 23
- `nextMatchCard` — line 32
- `mine` — line 38

### client/src/components/manage/ManageRail.tsx

- `isCurrent` — line 87
- `useOpenReports` — line 95
- `useRailGroups` — line 113
- `RailLink` — line 293
- `RailBody` — line 396
- `ManageRail` — line 517
- `zIndex` — line 563

### client/src/components/manage/ManageTable.tsx

- `ManageCard` — line 12
- `ManageTable` — line 84
- `LevelText` — line 192

### client/src/components/manage/MatchesTable.tsx

- `MatchesTable` — line 40
- `attentionOf` — line 60
- `vetoing` — line 68
- `inFilter` — line 85
- `matchesQuery` — line 102
- `teamsOf` — line 114
- `phaseOf` — line 118

### client/src/components/manage/NeedsYouQueue.tsx

- `KindDot` — line 30
- `NeedsYouQueue` — line 45
- `runAction` — line 51
- `handleActionClick` — line 71

### client/src/components/manage/PageTabs.tsx

- `PageTabs` — line 17

### client/src/components/manage/RecentLog.tsx

- `relativeTime` — line 16
- `RecentLog` — line 33

### client/src/components/manage/StatusStrip.tsx

- `ManageStatusTile` — line 27
- `StatusStrip` — line 77

### client/src/components/manage/TournamentBar.tsx

- `isTournamentPage` — line 28
- `TournamentBar` — line 39
- `tabPath` — line 52

### client/src/components/manage/TournamentScope.tsx

- `TournamentScope` — line 13
- `ScopedTournamentRedirect` — line 51

### client/src/components/manage/match/ConfirmAction.tsx

- `ConfirmAction` — line 51
- `close` — line 64
- `run` — line 69

### client/src/components/manage/match/MatchActionDialogs.tsx

- `ActionDialog` — line 43
- `run` — line 65
- `Effects` — line 122
- `ago` — line 152
- `MoveServerDialog` — line 161
- `ChangeMapDialog` — line 321
- `mapName` — line 389
- `sendRoster` — line 418
- `SwapSubDialog` — line 428
- `ActForTeamDialog` — line 564
- `CorrectMapDialog` — line 670
- `MessageAllDialog` — line 766

### client/src/components/manage/match/MatchStateBanner.tsx

- `MatchStateBanner` — line 39

### client/src/components/match/NextMatchCard.tsx

- `NextMatchCard` — line 38
- `changed` — line 62

### client/src/components/matchmaking/matchmakingStore.ts

- `openSocket` — line 113
- `on` — line 116
- `closeSocket` — line 127
- `emit` — line 132
- `nextDelay` — line 137
- `refreshMatchmaking` — line 144
- `subscribe` — line 167
- `useMatchmaking` — line 173
- `matchmakingAction` — line 190
- `secondsUntil` — line 208
- `teamSizeOf` — line 213
- `playersFor` — line 219
- `searchWindowElo` — line 228

### client/src/components/tournament/match/YourMatchCard.tsx

- `seriesWins` — line 21
- `InServerList` — line 39
- `YourMatchCard` — line 151
- `roster` — line 361

### client/src/components/tournament/page/TournamentRunState.tsx

- `TournamentRunState` — line 33
- `resume` — line 62

### client/src/hooks/useCurrentMatchStatus.ts

- `useCurrentMatchStatus` — line 39
- `scheduleSilentRefetch` — line 140
- `onConnect` — line 154
- `refetch` — line 182

### client/src/hooks/useLiveStats.ts

- `useLiveStats` — line 14
- `handleMatchUpdate` — line 77
- `refresh` — line 107

### client/src/hooks/useManageData.ts

- `useManageData` — line 31
- `loadInitial` — line 83

### client/src/hooks/useTeamMatchData.ts

- `useTeamMatchData` — line 49
- `resync` — line 309
- `isForAnotherMatch` — line 329
- `handleMatchUpdate` — line 335
- `handleBracketUpdate` — line 439
- `handleTournamentUpdate` — line 444

### client/src/hooks/useTournament.ts

- `useTournament` — line 18
- `loadData` — line 25
- `saveTournament` — line 87
- `updateSettings` — line 124
- `deleteTournament` — line 133
- `regenerateBracket` — line 139
- `resetTournament` — line 148
- `startTournament` — line 156
- `restartTournament` — line 179

### client/src/hooks/useTournamentPause.ts

- `useTournamentPause` — line 12

### client/src/hooks/useTournamentSignup.ts

- `signupPhase` — line 85
- `at` — line 87
- `useTournamentSignup` — line 103
- `refresh` — line 147
- `viewerRegistration` — line 160
- `remindLineupPlayer` — line 171

### client/src/hooks/useTournamentStatus.ts

- `useTournamentStatus` — line 13

### client/src/integrations/cs2/match/MatchServerPanel.tsx

- `mapDataFor` — line 25
- `isFinished` — line 42
- `effectiveServer` — line 60
- `useMatchConnect` — line 85
- `reload` — line 123
- `onMatch` — line 127
- `onFailover` — line 135
- `onVisible` — line 141
- `MatchServerPanel` — line 171
- `setVia` — line 202
- `onConnect` — line 239
- `onCopy` — line 263

### client/src/integrations/manual-report/match/ManualReportPanel.tsx

- `emptyRows` — line 87
- `stateOf` — line 90
- `headlineScore` — line 104
- `shownReport` — line 113
- `ManualReportPanel` — line 117
- `onReport` — line 181
- `openForm` — line 241
- `submitReport` — line 253

### client/src/integrations/types.ts

Contract/export file; no named function implementations.

### client/src/pages/Manage.tsx

- `ManageEyebrow` — line 44
- `Manage` — line 69
- `handleAnnounce` — line 125

### client/src/pages/ManageMatch.tsx

- `Section` — line 196
- `Group` — line 231
- `Target` — line 252
- `mapLabel` — line 291
- `secondsAgo` — line 299
- `justJoined` — line 301
- `clock` — line 303
- `money` — line 315
- `weaponLabel` — line 328
- `armourLabel` — line 329
- `ManageMatch` — line 351
- `changed` — line 423
- `up` — line 424
- `down` — line 425
- `playerName` — line 516
- `team` — line 538
- `stored` — line 677
- `askForceReady` — line 716
- `run` — line 726
- `askStart` — line 728
- `run` — line 739
- `askUnpause` — line 741
- `run` — line 748
- `askRestartServer` — line 750
- `run` — line 762
- `askRestartVeto` — line 769
- `run` — line 779
- `scrollToMaps` — line 781
- `roster` — line 785
- `readyLine` — line 786
- `onClick` — line 827
- `onClick` — line 845
- `run` — line 855
- `onClick` — line 880
- `onClick` — line 897
- `onClick` — line 922
- `run` — line 1112
- `run` — line 1266
- `run` — line 1294
- `run` — line 1311
- `run` — line 1328
- `run` — line 1368
- `run` — line 1421
- `run` — line 1494
- `run` — line 1525
- `run` — line 1735
- `run` — line 1927
- `run` — line 1950
- `run` — line 1977
- `run` — line 2015

### client/src/pages/MatchPage.tsx

- `mapName` — line 53
- `MatchPage` — line 59
- `changed` — line 72
- `won` — line 139
- `side` — line 153

### client/src/types/match.types.ts

Contract/export file; no named function implementations.

### client/src/types/matchPhase.types.ts

- `getPhaseDisplay` — line 31

### client/src/utils/manageSelectors.ts

- `hasAssignedTeams` — line 21
- `computeStatusCounts` — line 46
- `matchDisplayName` — line 94
- `manageMatchRefs` — line 103
- `computeNeedsYouItems` — line 120
- `computeRecentEvents` — line 165

### client/src/utils/matchFlags.ts

- `isManualMatch` — line 25
- `isShuffleMatch` — line 37
- `isVetoDisabledForMatch` — line 59

### client/src/utils/matchPhase.ts

- `matchPhaseOf` — line 14

### client/src/utils/tournamentStatus.ts

- `isStarted` — line 8
- `isUpcoming` — line 13
