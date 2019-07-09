import React from 'react';
import io from "socket.io-client";

let socket;

let canvasPos;

let draw;

let thisPlayer

let gameInterval;

let players;

let thisId;

function Player(name,color){
    this.name = name;

    this.color = color;

    this.mouse = {x: 0, y: 0}
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
            

            console.log(players)

            console.log(thisId)
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

