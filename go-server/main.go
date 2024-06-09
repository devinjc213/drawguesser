package main

import (
  "fmt"
  "encoding/json"
  "net/http"
)

type CreateRoomRequest struct {
    PlayerID string `json:"playerId"`
    RoomName string `json:"roomName"`
    MaxPlayers int `json:"maxPlayers"`
    NumberOfRounds int `json:"numberOfRounds"`
    RoundTimer int `json:"roundTimer"`
    HintsEnabledAfter int `json:"hintsEnabledAfter"`
    WordList []string `json:"wordList"`
}

func createRoomHandler(w http.ResponseWriter, r *http.Request) {
  var req CreateRoomRequest
  err := json.NewDecoder(r.Body).Decode(&req)
  if err != nil {
    http.Error(w, err.Error(), http.StatusBadRequest)
    return
  }

  fmt.Fprintf(w, "creating room with name=%v, maxPlayers=%v, numberOfRounds=%v\n", req.RoomName, req.MaxPlayers, req.NumberOfRounds)
}

func main() {
  mux := http.NewServeMux()
  mux.HandleFunc("POST /create-room", createRoomHandler)

  mux.HandleFunc("/task/{id}/", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")
    fmt.Fprintf(w, "handling task with id=%v\n", id)
  })

  http.ListenAndServe("localhost:8090", mux)
}
