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

    this.radius = 20;
}

function UnclaimedDisk(x,y){
    this.x = x

    this.y = y

    this.radius = 20
}


//returns the distance between two points.
function distance(x1,y1,x2,y2){
    return Math.sqrt(((x1-x2)**2)+((y1-y2)**2))
}

//hello
thisPlayer = new Player("Ashlyn","#ff0000")


class GameScreen extends React.Component {  

    //sets up game once the canvas mounts on screen

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

            const diskPos = diskLocations[thisId]

            for(let i = 0; i <= thisId; i++){
                unclaimedDisks.push(new UnclaimedDisk(diskLocations[i].x,diskLocations[i].y))
            }
        })

        socket.on("other join response", function(data){
            players = data

            console.log(players)

            const diskPos = diskLocations[unclaimedDisks.length]

            unclaimedDisks.push(new UnclaimedDisk(diskPos.x,diskPos.y))
        })

        socket.on("player info response", function(player){
            players[player.id] = player;
        })

        socket.on("claim disk response", function(data){
            unclaimedDisks = data
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

                draw.beginPath();

                draw.arc(players[i].mouse.x,players[i].mouse.y,5,0,2*Math.PI)
                
                draw.fillStyle = players[i].color
        
                draw.fill();

                if(players[i].hasDisk === 1){

                    draw.beginPath();

                    draw.arc(players[i].disk.x,players[i].disk.y,players[i].disk.radius,0,2*Math.PI)
                    
                    draw.strokeStyle = players[i].color
            
                    draw.stroke();
                }
        }

        for(let i = 0; i < unclaimedDisks.length; i++){

            const current = unclaimedDisks[i]

            draw.beginPath();

            draw.arc(current.x,current.y,current.radius,0,2*Math.PI)
            
            draw.strokeStyle = "#ffffff"
    
            draw.stroke();
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

    onClick = (event) =>{
        this.getCanvasPos()

        if(players[thisId].hasDisk === 0){

            unclaimedDisks.forEach(function(current){

                console.log(distance(players[thisId].mouse.x,players[thisId].mouse.y,current.x,current.y))

                if(distance(players[thisId].mouse.x,players[thisId].mouse.y,current.x,current.y) <= current.radius){
                    players[thisId].disk = new Disk(current.x,current.y)

                    players[thisId].hasDisk = 1;

                    unclaimedDisks.splice(current,1)

                    socket.emit("claim disk", unclaimedDisks)

                    socket.emit("player info", players[thisId])
                }
            })
        }
    }

    getCanvasPos = function(){
        canvasPos = this.refs.canvas
    }

    render() {
        return(
            <canvas onMouseMove = {this.onMouseMove} onClick = {this.onClick} id ="canvas-a" ref="canvas" width="1200px" height="800px"/>
        )
    }
}
export {GameScreen}

