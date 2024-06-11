package main

import (
  "fmt"
)

type Player struct {
  Id string
  Name string
  Score int
  Ready bool
}

type Message struct {
  Player Player
  Msg string
}

type Room struct {
  Id string
  Name string
  Players []Player
  Drawer Player
  MaxPlayers int
  PlayersGuessedCorrectly []Player
  RoundStarted bool
  RoundTimer int
  NumberOfRounds int
  MaxHints int
  HintsEnabledAfter int
  WordList []string
  ChatHistory []Message
}

func CreateRoom (
  name string,
  players []Player,
  maxPlayers int,
  numberOfRounds int,
  roundTimer int,
  maxHints int,
  hintsEnabledAfter int,
  wordList []string,
) *Room {
  return &Room{
    Name: name,
    Players: players,
    MaxPlayers: maxPlayers,
    NumberOfRounds: numberOfRounds,
    RoundTimer: roundTimer,
    MaxHints: maxHints,
    HintsEnabledAfter: hintsEnabledAfter,
    WordList: wordList,
  }
}

func (room *Room) JoinRoom(player Player) {
  room.players = append(room.players, player) 
}

func (room *Room) LeaveRoom(player Player) {
  for i, p := range room.players {
    if p.Id == player.Id {
      room.players = append(room.players[:i], room.players[i+1]...)
      return
    }
  }
}

func (room *Room) PlayerReady(player Player) {}

func (room *Room) HandleMessage() 
