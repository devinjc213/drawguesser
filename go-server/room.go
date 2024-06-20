package main

import (
  "slices"
)

type Player struct {
  Id    string `json:"id"`
  Name  string `json:"name"`
  Score int `json:"score"`
  Ready bool `json:"ready"`
}

type Message struct {
  Player Player `json:"player"`
  Msg    string `json:"msg"`
}

type Room struct {
  Id                      string `json:"id"`
  Name                    string `json:"name"`
  Players                 []Player `json:"players"`
  Drawer                  Player `json:"drawer"`
  MaxPlayers              int `json:"maxPlayers"`
  PlayersGuessedCorrectly []Player `json:"playersGuessedCorrectly"`
  RoundStarted            bool `json:"roundStarted"`
  RoundTimer              int `json:"roundTimer"`
  NumberOfRounds          int `json:"numberOfRounds"`
  MaxHints                int `json:"maxHints"`
  HintsEnabledAfter       int `json:"hintsEnabledAfter"`
  WordList                []string `json:"wordList"`
  ChatHistory             []Message `json:"chatHistory"`
}

type CreateRoomRequest struct {
  PlayerName        string `json:"playerName"`
  RoomName          string `json:"roomName"`
  MaxPlayers        int `json:"maxPlayers"`
  NumberOfRounds    int `json:"numberOfRounds"`
  RoundTimer        int `json:"roundTimer"`
  MaxHints          int `json:"maxHints"`
  HintsEnabledAfter int `json:"hintsEnabledAfter"`
  WordList          []string `json:"wordList"`
}

type CreateRoomOptions struct {
  Id string
  Name string
  Creator Player
  MaxPlayers int
  NumberOfRounds int
  RoundTimer int
  MaxHints int
  HintsEnabledAfter int
  WordList []string
}

func CreateRoom (opt CreateRoomOptions) *Room {
  players := make([]Player, 1, opt.MaxPlayers)
  players[0] = opt.Creator

  return &Room{
    Id: opt.Id,
    Name: opt.Name,
    Players: players,
    NumberOfRounds: opt.NumberOfRounds,
    RoundTimer: opt.RoundTimer,
    MaxHints: opt.MaxHints,
    HintsEnabledAfter: opt.HintsEnabledAfter,
    WordList: opt.WordList,
  }
}

func (room *Room) JoinRoom(player Player) {
  room.Players = append(room.Players, player) 
}

func (room *Room) LeaveRoom(player Player) {
  playerIndex := slices.Index(room.Players, player)

  if player.Id == room.Drawer.Id {
    if playerIndex < len(room.Players) - 1 {
      room.Drawer = room.Players[playerIndex + 1]
    } else {
      room.Drawer = room.Players[0]
    }

    // Game.DrawRoundEnd()
  }

  for i, p := range room.Players {
    if p.Id == player.Id {
      room.Players = append(room.Players[:i], room.Players[i+1:]...)
      return
    }
  }

  if len(room.Players) == 0 {
    // Game.GameEnd()
  } else {
    // emit player update
  }
}

func (room *Room) PlayerReady(player Player) {
  playerIndex := slices.Index(room.Players, player)

  room.Players[playerIndex].Ready = !room.Players[playerIndex].Ready

  // emit player update

  if allPlayersReady(room.Players) {
    // emit can start if all ready
  }
}

func (room *Room) HandleMessage() {}

func allPlayersReady(players []Player) bool {
  for _, player := range players {
    if !player.Ready {
      return false
    }
  }

  return true
}
