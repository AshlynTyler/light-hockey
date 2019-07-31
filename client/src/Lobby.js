import React from 'react';
import io from "socket.io-client";
import './App.css';

let socket;

let player;

let listening = false;

class Lobby extends React.Component {

    state={
        rooms: [],
        max: 4,
        player: {
            name: this.props.userName,
            color: this.props.userColor,
            joined: false,
            colorValue: this.props.userColorValue
        },
        
    }

    componentDidMount(){
        socket  = this.props.userSocket

        player = {
            name: this.props.userName,
            color: this.props.userColor,
            joined: false,
            colorValue: this.props.userColorValue
        }

        this.colorChange(player.colorValue)


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

        socket.on("rooms change response", (rooms) =>{
            this.setState({rooms: rooms})
        })

        socket.on("enter lobby response", (rooms) =>{
            this.setState({rooms: rooms})
        })

        socket.on("start game response", (data) =>{
            data.player = this.state.player

            socket.emit("start game response b", data)
        })
        
        socket.emit("enter lobby")
    }

    changeMax = () =>{
        if(this.state.max === 2)
            this.setState({max: 4})
        else
            this.setState({max: 2})
    }

    createRoom = () =>{
        socket.emit("create preroom", {player: this.state.player, max: this.state.max})
    }

    joinRoom = (room) =>{
        player.id = room.players.length

        room.joined = true;

        player.joined = true;

        player.room = room.id;

        player.ready = false

        room.players.push(player)

        this.setState({player: player})

        socket.emit("join room",{rooms: this.state.rooms, id: room.id})
    }

    leaveRoom = (room) =>{
        room.joined = false;

        player.joined = false

        player.room = ""

        room.players.splice(player.id,1)

        for(let i = player.id; i < room.players.length; i++){
            room.players[i].id--
        }

        if(room.players.length === 0){
            this.state.rooms.splice(this.state.rooms.indexOf(room),1)
        }


        this.setState({player: player})

        socket.emit("leave room",{rooms: this.state.rooms, id: room.id})
    }

    ready = (room) =>{

        player.ready = true;

        room.players[player.id].ready = true

        this.setState({player: player})

        

        let readyNum = 0

        if(room.maxPlayers === room.players.length){
            room.players.forEach((player) =>{
                if(player.ready === true)
                    readyNum++
            })

            if(readyNum === room.maxPlayers){
                this.state.rooms.splice(this.state.rooms.indexOf(room),1)
                socket.emit("start game", {roomId: room.id, player: this.state.player})
            }
        }

        socket.emit("ready", this.state.rooms)
    }

    unReady = (room) =>{
        player.ready = false;

        room.players[player.id].ready = false

        this.setState({player: player})

        socket.emit("ready", this.state.rooms)
    }

    handleChange = (event) =>{
        player.name = event.target.value

        this.state.rooms.forEach((room) =>{
            if(room.id === player.room){
                room.players[player.id].name = player.name

                socket.emit("ready", this.state.rooms)
            }
        })
        this.setState({player: player});

        socket.emit("ready", this.state.rooms)
    }

    handleColorChange = (event) =>{
        this.colorChange(event.target.value)

        socket.emit("ready", this.state.rooms)
    }

    colorChange = (value) =>{

        player.colorValue = value

        let red = 0;

        let green = 0;

        let blue = 0;

        if(value <= 100 || value > 500){
            red = 255
        }

        if(value > 100 && value <= 200)
            red = 255 - ((value -100) *2.55)

        if(value > 400 && value <= 500)
            red = ((value -400) *2.55)

        if(value > 100 && value <= 300)
            green = 255

        if(value <= 100)
            green = ((value) *2.55)

        if(value > 300 && value <= 400)
            green = 255 - ((value -300) *2.55)

        if(value > 300 && value <= 500)
            blue = 255

        if(value > 200 && value <= 300)
            blue = ((value -200) *2.55)

        if(value > 500)
            blue = 255 - ((value -500) *2.55)
        
        red = Math.round(red).toString(16)

        green = Math.round(green).toString(16)

        blue = Math.round(blue).toString(16)

        if(red.length === 1)
            red = "0" + red

        if(green.length === 1)
            green = "0" + green

        if(blue.length === 1)
            blue = "0" + blue

        player.color = `#${red}${green}${blue}`

        this.state.rooms.forEach((room) =>{
            if(room.id === player.room){
                room.players[player.id].color = player.color

                room.players[player.id].colorValue = player.colorValue

                socket.emit("ready", this.state.rooms)
            }
        })

        this.setState({player: player});

        
    }

    render(){

        const  max = this.state.max;

        const  rooms = this.state.rooms;

        const thisPlayer = this.state.player
        return(
            <>
            <h1>Light Hockey</h1>
            <div id = "lobby-container" className = "flex-container">

                <div id = "user">
                <label>
                    Username:
                    <input type="text" id = "nameInput" style={{color: this.state.player.color}} value={this.state.player.name} onChange={this.handleChange} />

                    <p> Color:</p>

                    <input type="range" min="1" max="600" value={this.state.player.colorValue} className="slider" id="colorRange" onChange={this.handleColorChange} onLoad={this.colorChange}/>
                </label>
                </div>

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
                    {rooms.map((room) =>{
                        return(
                            <div className = "flex-container room" key ={room.id}>
                                <p className = "room-name">{room.id}</p>
                                <p className = "num-players">{room.maxPlayers}-player</p>
                                {room.players.map((player) =>{
                                    if(player.ready)
                                        return(
                                            <div className = "player-icon green" style ={{color: player.color}} key = {player.id}>{player.name}</div>
                                        )
                                    else
                                        return(
                                            <div className = "player-icon red" style ={{color: player.color}} key = {player.id}>{player.name}</div>
                                        )
                                })}

                                {thisPlayer.room === room.id ? (
                                            <>
                                                <div className = "leave-button button" onClick = {() => this.leaveRoom(room)}>leave</div>
                                                {this.state.player.ready === false ? (
                                                    <div className = "ready-button button" onClick = {() => this.ready(room)}>ready</div>
                                                ) : (
                                                    <div className = "unready-button button" onClick = {() => this.unReady(room)}>unready</div>
                                                )}

                                            </>
                                        ): (room.players.length < room.maxPlayers && player.joined === false ? (
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