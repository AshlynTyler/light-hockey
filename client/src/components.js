import React from 'react';
import io from "socket.io-client";

let socket;

let canvasPos;

let draw;

let thisPlayer

let gameInterval;

let players;

let thisId;

let unclaimedDisks = [];

let diskLocations = [{x: 50, y: 50},{x: 300, y: 50},{x: 50, y: 300},{x: 300, y: 300}]

function Player(name,color){
    this.name = name;

    this.color = color;

    this.mouse = {x: 0, y: 0}

    this.hasDisk = 0
}

function Disk(x,y){
    this.x = x

    this.y = y

    this.maxSpeed = 10;
}

function UnclaimedDisk(x,y){
    this.x = x

    this.y = y
}



//hello
thisPlayer = new Player("Ashlyn","#ff0000")


class GameScreen extends React.Component {  
    componentDidMount() {
        const canvas = this.refs.canvas
        draw = canvas.getContext("2d")

        draw.translate(.5,.5);

        

        gameInterval = setInterval(() =>{
            this.renderFrame()
        },(1000/60))

        socket = this.props.userSocket

        players = []

        socket.emit("player join", thisPlayer)

        socket.on("player join response", function(data){
            players = data.players

            thisId = data.id

            const diskPos = unclaimedDisks[thisId]
            

            console.log(players)

            console.log(thisId)

            unclaimedDisks.push(new Disk(diskPos.x,diskPos.y))
        })

        socket.on("other join response", function(data){
            players = data

            console.log(players)
        })

        socket.on("player info response", function(player){
            players[player.id] = player;
        })
    }

    //clears the entire canvas
    clearCanvas = function(){
        draw.clearRect(
            0,
            0,
            this.refs.canvas.offsetWidth,
            this.refs.canvas.offsetHeight
        )
    }

    renderFrame = function(){

        
    
        this.clearCanvas();
    
        

        for(let i = 0; i < players.length; i++){
            if(players[i].mouse.x){

                draw.beginPath();

                draw.arc(players[i].mouse.x,players[i].mouse.y,5,0,2*Math.PI)
                
                draw.fillStyle = players[i].color
        
                draw.fill();
            }

            
        }
    }

    onMouseMove = (event) =>{
        this.getCanvasPos()

        if (typeof(thisId) != "undefined"){
            players[thisId].mouse.x = event.pageX - canvasPos.offsetLeft
            players[thisId].mouse.y = event.pageY - canvasPos.offsetTop

            socket.emit("player info", players[thisId])
        }
    }

    getCanvasPos = function(){
        canvasPos = this.refs.canvas
    }

    render() {
        return(
            <canvas onMouseMove = {this.onMouseMove} id ="canvas-a" ref="canvas" width="1200px" height="800px"/>
        )
    }
}
export {GameScreen}

