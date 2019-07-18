import React from 'react';
import io from "socket.io-client";
import './App.css';

let socket;

let player;

class Lobby extends React.Component {

    state={
        rooms: [],
        max: 4,
        player: {
            name: this.props.userName,
            color: this.props.userColor,
            joined: false
        }
    }

    componentWillMount(){
        socket  = this.props.userSocket

        player = {
            name: this.props.userName,
            color: this.props.userColor,
            joined: false
        }

        socket.on("create preroom response", (rooms) =>{
            player.room = rooms[rooms.length-1].id

            player.id = 0

            player.joined = true

            player.ready = false;

            this.setState({rooms: rooms, player: player})
        })

        socket.on("other preroom response", (rooms) =>{
            this.setState({rooms: rooms})
        })
    }

    changeMax = () =>{
        console.log("click event fired")
        if(this.state.max === 2)
            this.setState({max: 4})
        else
            this.setState({max: 2})
    }

    createRoom = () =>{
        socket.emit("create preroom", {player: this.state.player, max: this.state.max})
    }

    joinRoom = function(room){
        player.id = room.length

        room.joined = true;

        player.joined = true;

        player.ready = false

        room.push(player)
    }

    render(){

        const  max = this.state.max;

        const  rooms = this.state.rooms;

        const thisPlayer = this.state.player
        return(
            <>
            <h1>Light Hockey</h1>
            <div id = "lobby-container" className = "flex-container">

                <div id = "user"></div>

                <div id = "room-list">
                    {!thisPlayer.joined ? (
                        (max === 2) ? (
                            <div id = "create-room" className = "flex-container">
                                <div className = "p-button button selected" >2 Player</div>
                                <div className = "p-button button" onClick = {this.changeMax}>4 Player</div>
                                <div className = "create-button button" onClick = {this.createRoom}>Create Room</div>
                            </div>                           
                        ) :
                        (
                            <div id = "create-room" className = "flex-container">
                                <p className = "p-button button" onClick = {this.changeMax}>2 Player</p>
                                <p className = "p-button button selected">4 Player</p>
                                <p className = "create-button button" onClick = {this.createRoom}>Create Room</p>
                            </div>
                        )
                    ):(<></>)}
                    {rooms.map(function(room){
                        return(
                            <div className = "flex-container room" key ={room.id}>
                                <p className = "room-name">{room.id}</p>
                                <p className = "num-players">{room.maxPlayers}-player</p>
                                {room.players.map(function(player){
                                    if(player.ready)
                                        return(
                                            <div className = "player-icon green" key = {player.id}>{player.name}</div>
                                        )
                                    else
                                        return(
                                            <div className = "player-icon red" key = {player.id}>{player.name}</div>
                                        )
                                })}

                                {thisPlayer.room === room.id ? (
                                            <>
                                                <div className = "leave-button button">leave</div>
                                                <div className = "ready-button button">ready</div>
                                            </>
                                        ): (room.players < room.maxPlayers ? (
                                            <div className = "join-button button" onClick = {() => this.joinRoom(room)}>join</div>
                                        ):(<></>)
                                        )
                                }
                            </div>
                            
                        )
                    })}
                </div>
            </div>
            </>
        )
    }
}

export {Lobby}