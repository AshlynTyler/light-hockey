import React from 'react';
import {GameScreen} from "./GameScreen"
import io from "socket.io-client";
import {Lobby} from "./Lobby"

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      endpoint:{
        response: true,
        endpoint: "http://localhost:3001"
      },
      socket: {},
      userName: "guest",
      userColor: "#ff0000",
      userColorValue: Math.floor(Math.random() * 600 + 1),
      inGame: false
    };
  }

  componentWillMount() {
    const { endpoint } = this.state.endpoint;
    this.state.socket = io(process.env.PORT || "http://localhost:3001");


  }

  componentDidMount() {
    this.state.socket.on("start game response c", (data) =>{


      this.state.socket.emit("start game events", data.roomId)
      this.setState({userName:data.player.name, userColor: data.player.color, userColorValue: data.player.colorValue, inGame: true})
    })

    this.state.socket.on("end game response", () =>{
      this.setState({inGame: false})
    })
  }
  
  render(){
    if(this.state.inGame)
      return (
        <GameScreen userSocket={this.state.socket} userName = {this.state.userName} userColor = {this.state.userColor}/>
      );
    else
      return(
        <Lobby userSocket={this.state.socket} userName = {this.state.userName} userColor = {this.state.userColor} userColorValue = {this.state.userColorValue}/>
      )
    }
}

export default App;
