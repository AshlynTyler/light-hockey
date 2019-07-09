import React from 'react';
import './App.css';
import {GameScreen} from "./components"
import io from "socket.io-client";

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      endpoint:{
        response: true,
        endpoint: "http://localhost:3001"
      },
      socket: {}
    };
  }

  componentWillMount() {
    const { endpoint } = this.state.endpoint;
    this.state.socket = io("http://localhost:3001");
    this.state.socket.on("test-response", data => console.log(data));
    this.state.socket.emit("test", "hello!")
  }
  
  render(){
    return (
    <GameScreen userSocket={this.state.socket}/>
  );
    }
}

export default App;
