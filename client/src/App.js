import React from 'react';
import './App.css';
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
      inGame: false
    };
  }

  componentWillMount() {
    const { endpoint } = this.state.endpoint;
    this.state.socket = io(process.env.PORT || "http://localhost:3001");
  }
  
  render(){
    if(this.state.inGame)
      return (
        <GameScreen userSocket={this.state.socket} userName = {this.state.userName} userColor = {this.state.userColor}/>
      );
    else
      return(
        <Lobby userSocket={this.state.socket} userName = {this.state.userName} userColor = {this.state.userColor}/>
      )
    }
}

export default App;
