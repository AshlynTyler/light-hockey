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

    this.maxSpeed = 20;

    this.radius = 20;

    this.direction = 0;

    this.speed = 0;
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

//returns the angle of direction in radians from the first point to the second point
// relative to the positive x axis (going counterclockwise).

function direction(x1,y1,x2,y2){

    return Math.atan2(y1-y2,x2-x1)
}

//returns the x and y length of a right triangle with hypotenuse of "length"
// and an angle of "angle".

function findXY(length,angle){
    return{
        y: Math.sin(angle) * length * -1,
        x: Math.cos(angle) * length
    }
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
            this.gameStep()
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

    gameStep = function(){

        if (typeof(thisId) != "undefined"){

            let player = players[thisId]

            //moves your disk towards you.

            if(player.hasDisk === 1){

                players[thisId].disk.direction = direction(player.disk.x,player.disk.y,player.mouse.x,player.mouse.y)

                if(distance(player.mouse.x,player.mouse.y,player.disk.x,player.disk.y) <= player.disk.maxSpeed){
                    players[thisId].disk.x = player.mouse.x
                    players[thisId].disk.y = player.mouse.y

                    players[thisId].disk.speed = player.disk.maxSpeed
                }
                else{
                    const moveDist = findXY(player.disk.maxSpeed,players[thisId].disk.direction)

                    players[thisId].disk.x += moveDist.x
                    players[thisId].disk.y += moveDist.y

                    players[thisId].disk.speed = distance(0,0,moveDist.x,moveDist.y)
                }

            }

            socket.emit("player info", players[thisId])

        }

        

        this.renderFrame()
    }

    renderFrame = function(){

        
    
        this.clearCanvas();
    
        

        for(let i = 0; i < players.length; i++){

                //render mouse pointer of players

                draw.beginPath();

                draw.arc(players[i].mouse.x,players[i].mouse.y,5,0,2*Math.PI)
                
                draw.fillStyle = players[i].color
        
                draw.fill();

                //render disks of players

                if(players[i].hasDisk === 1){

                    draw.beginPath();

                    draw.arc(players[i].disk.x,players[i].disk.y,players[i].disk.radius,0,2*Math.PI)
                    
                    draw.strokeStyle = players[i].color
            
                    draw.stroke();
                }
        }

        //render unclaimed disks

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

            
        }
    }

    onClick = (event) =>{
        this.getCanvasPos()

        if(players[thisId].hasDisk === 0){

            unclaimedDisks.forEach(function(current){

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
            <canvas onMouseMove = {this.onMouseMove} onClick = {this.onClick} id ="canvas-a" ref="canvas" width="1200px" height="675px"/>
        )
    }
}
export {GameScreen}

