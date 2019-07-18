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

        socket.on("create preroom response", function(rooms){
            rooms[rooms.length-1].joined = true

            player.id = 0

            player.joined = true

            player.ready = false;

            this.setState({rooms: rooms, player: player})
        })

        socket.on("other preroom respons", function(rooms){
            this.setState({rooms: rooms})
        })
    }

    twoPlayer = function(){
        if(this.state.max === 2)
            this.setState({max: 4})
        else
            this.setState({max: 2})
    }

    createRoom = function(){
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
        return(
            <>
            <h1>Light Hockey</h1>
            <div id = "lobby-container" className = "flex-container">

                <div id = "user"></div>

                <div id = "room-list">
                    {function(){
                        if(!this.state.player.joined){
                            if(this.state.max === 2)
                                return(
                                    <div id = "create-room" className = "flex-container">
                                        <div className = "p-button button selected" >2 Player</div>
                                        <div className = "p-button button" onClick = {() => this.changeMax}>4 Player</div>
                                        <div className = "create-button button" onClick = {() => this.createRoom}>Create Room</div>
                                    </div>
                                )
                            else
                                return(
                                    <div id = "create-room">
                                        <div className = "p-button button" onClick = {() => this.changeMax}>2 Player</div>
                                        <div className = "p-button button selected">4 Player</div>
                                        <div className = "create-button button">Create Room</div>
                                    </div>
                                )
                        }
                    }}
                    {this.state.rooms.map(function(room){
                        return(
                            <div className = "flex-container room">
                                <p className = "room-name">{room.id}</p>
                                {room.players.map(function(player){
                                    if(player.ready)
                                        return(
                                            <div className = "player-icon green">{player.name}</div>
                                        )
                                    else
                                        return(
                                            <div className = "player-icon red">{player.name}</div>
                                        )
                                })}

                                {function(){
                                    if(room.joined)
                                        return(
                                            <>
                                                <div className = "leave-button button">leave</div>
                                                <div className = "ready-button button">ready</div>
                                            </>
                                        )
                                    else if(room.players < room.maxPlayers)
                                        return(
                                            <div className = "join-button button" onClick = {() => this.joinRoom(room)}>join</div>
                                        )
                                }}
                            </div>
                            
                        )
                    })}
                </div>
            </div>
            </>
        )
    }
}