package main

import (
  "math/rand"
  "time"
  "encoding/json"
  "net/http"
  "log"
  "fmt"

  "github.com/gin-gonic/gin"

  socketio "github.com/googollee/go-socket.io"
)

func GinMiddleware(allowOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, Content-Length, X-CSRF-Token, Token, session, Origin, Host, Connection, Accept-Encoding, Accept-Language, X-Requested-With")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Request.Header.Del("Origin")

		c.Next()
	}
}

var allowOriginFunc = func(r *http.Request) bool {
  return true
}

var GameRoomState = make(map[string]*Room)

func generateRoomId() string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
  rand.New(rand.NewSource(time.Now().UnixNano()))
	str := make([]byte, 6)
	for i := range str {
		str[i] = letters[rand.Intn(len(letters))]
	}
	return string(str)
}

func broadcastRoomUpdate(server *socketio.Server, roomId string) {
  roomJson, err := json.Marshal(GameRoomState)
  if err != nil {
    log.Println("Error marshalling GameRoomState object: ", err)
    return
  }

  server.BroadcastToRoom("/", "lobby", "room_update", string(roomJson))
  if roomId != "" {
    server.BroadcastToRoom("/", roomId, "room_update", string(roomJson))
  } 
}

func main() {
  router := gin.New()

  sockServ := socketio.NewServer(nil)

  sockServ.OnConnect("/", func(s socketio.Conn) error {
    s.Emit("connect", true)
    s.SetContext("")
    s.Join("lobby")
    log.Println("user connected: ", s.ID())

    return nil
  })

  sockServ.OnEvent("/", "create_room", func(s socketio.Conn, data CreateRoomRequest) {
    fmt.Println("create room received")
    roomId := generateRoomId()

    creator := Player{
      Id: s.ID(),
      Name: data.PlayerName,
      Score: 0,
      Ready: false,
    }

    options := CreateRoomOptions{
      Id: roomId,
      Name: data.RoomName,
      Creator: creator,
      MaxPlayers: data.MaxPlayers,
      NumberOfRounds: data.NumberOfRounds,
      RoundTimer: data.RoundTimer,
      MaxHints: data.MaxHints,
      HintsEnabledAfter: data.HintsEnabledAfter,
      WordList: data.WordList,
    }

    newRoom := CreateRoom(options)
    
    GameRoomState[roomId] = newRoom

    s.Leave("lobby")
    s.Join(roomId)

    s.Emit("create_join_room", roomId)

    broadcastRoomUpdate(sockServ, roomId)

    playersInRoom, err := json.Marshal(newRoom.Players)
    if err != nil {
      log.Println("Error marshalling players: ", err)
      return
    }
    s.Emit("players_in_room", string(playersInRoom))
  })

  go func() {
    if err := sockServ.Serve(); err != nil {
      log.Fatalf("socketio listen error: %s\n", err)
    }
  }()
  defer sockServ.Close()

  router.Use(GinMiddleware("http://localhost:3000"))
  router.GET("/socket.io/*any", gin.WrapH(sockServ))
  router.POST("/socket.io/*any", gin.WrapH(sockServ))
  router.StaticFS("/public", http.Dir("../asset"))


  if err := router.Run(":8090"); err != nil {
    log.Fatal("failed to run app: ", err)
  }
  fmt.Println("server started...")
}
