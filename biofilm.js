let _unique_cell_id = 0;
let generateCellID = () => _unique_cell_id++;

let rect = new Border(0,0,40,40) // Mouse over rect
let mouseDown = false

class Biofilm {

    constructor(cfg){
        this.config = cfg
        this.max_cells = cfg.max_cells
        this.init_cells = cfg.init_cells
        this.width = cfg.width
        this.height = cfg.height
        window['metabolite_display'] = 'R'
        this.left = (this.width - (this.config.chamber_size))/2
        this.right = this.width - (this.width-this.config.chamber_size)/2
        this.top = (this.height-this.config.chamber_size)/2
        this.bottom = this.height - (this.height-this.config.chamber_size)/2
        this.cells = []
                        
    }

    initialise(){
        for(let i=0; i<this.init_cells; i++) 
        {
            let type = Math.random() < 0.5 ? 1 : 2
            let random_cell = {x: 0.5*this.config.chamber_size*((Math.random()*2)-1)+this.width/2,
                                y: 0.5*this.config.chamber_size*((Math.random()*2)-1)+this.height/2,
                                growthrate: Math.random(),
                                size: this.config.cell_size,
                                resources: 0,
                                BB1: 0,
                                BB2: 0,
                                biomass: 1,
                                type: type}                                
            this.cells.push(new Cell(random_cell) )
        }

        // Resource grid
        this.grid = []
        this.next_grid = []
        this.scale = 5
        for(let x = 0; x < this.width/this.scale; x++){            
            this.grid[x] = []
            this.next_grid[x] = []
            for(let y = 0; y < this.height/this.scale; y++){                
                if(this.coords_in_chamber(x,y,this.scale)){
                    this.grid[x][y] = {R: this.config.initial_R, BB1: 0, BB2: 0} 
                }
                else{
                    this.grid[x][y] = undefined     
                }
            }
        }
        this.add_grid_choice()

        // Viridis array
        this.viridis = []
        let n = 100
        let rgbs = [[68, 1, 84], [59, 82, 139], [33, 144, 140], [93, 201, 99], [253, 231, 37]]
        let segment_len = Math.ceil(n / (rgbs.length-1))
        let total_added_colours = 0
        
        // Interpolation so you have 'n' viridis colours stored in an array (this.viridis)
        for (let arr = 0; arr < rgbs.length - 1 ; arr++) {
            let arr1 = rgbs[arr]
            let arr2 = rgbs[arr+1]
            for (let i = 0; i < segment_len; i++){
                let r, g, b
                if (arr2[0] > arr1[0]) r = Math.floor(arr1[0] + (arr2[0] - arr1[0])*( i / (segment_len-1) ))
                else r = Math.floor(arr1[0] - (arr1[0] - arr2[0]) * (i / (segment_len-1)))
                if (arr2[1] > arr1[1]) g = Math.floor(arr1[1] + (arr2[1] - arr1[1]) * (i / (segment_len - 1)))
                else g = Math.floor(arr1[1] - (arr1[1] - arr2[1]) * (i / (segment_len - 1)))
                if (arr2[2] > arr1[2]) b = Math.floor(arr1[2] + (arr2[2] - arr1[2]) * (i / (segment_len - 1)))
                else b = Math.floor(arr1[2] - (arr1[2] - arr2[2]) * (i / (segment_len - 1)))
                this.viridis.push([Math.min(r,255), Math.min(g,255), Math.min(b,255)])
                total_added_colours++
                if(total_added_colours == n) break
            }
        }  
    }

    add_grid_choice(){
        let container = document.createElement("div")
        container.classList.add("form-container")        
        let select = document.createElement("select")
        container.innerHTML += "<div style='width:100%;height:20px;font-size:12px;'><b>Metabolite to display</b></div>"

        // Setting slider variables / handler
        let option = document.createElement("option")
        option.value = "R"
        option.text = "Primary resource"
        select.append(option)
        option = document.createElement("option")
        option.value = "BB1"
        option.text = "Amino acid 1"
        select.append(option)
        option = document.createElement("option")
        option.value = "BB2"
        option.text = "Amino acid 2"
        select.append(option)
        
        select.oninput = function () {
            let value = select.value
            window['metabolite_display'] = value
            console.log(`Switching to displaying ${window['metabolite_display']}`)
        }
        container.appendChild(select)
        document.getElementById("form_holder").appendChild(container)
    }

    coords_in_chamber(x,y,scale){
        return (y*scale > this.bottom || (x*scale > this.left) && y*scale > this.top && x*scale < this.right)
    }
    
    create_display(){
        // First, create a div that can hold the canvas elements
        let canvasdiv = document.createElement("div")            
        canvasdiv.innerHTML += "<center>Cells (growth rate) </center>"

        // First: primary display for microfluidic chamber
        let canvas = document.createElement("canvas")        
        canvas.width=this.config.width
        canvas.height=this.config.height        
        canvasdiv.appendChild(canvas)        
        
        
        canvas.addEventListener('mousemove', (e) => { 
            let coords = getCursorPosition(canvas,e,1) 
            rect.x = coords.x-rect.w/2
            rect.y = coords.y-rect.h/2
            rect.left_bound = rect.x
            rect.right_bound = rect.x + rect.w
            rect.top_bound = rect.y
            rect.bot_bound = rect.y + rect.h
        })    
        canvas.addEventListener('mousedown', (e) => { mouseDown = true })
        canvas.addEventListener('mouseup', (e) => { mouseDown = false })

        
        this.canvas = canvas
        this.ctx = this.canvas.getContext("2d")        

        // Second: display for resource concs
        let canvasdiv2 = document.createElement("div")            
        canvasdiv2.innerHTML += "<center>Metabolite concentrations</center>"
        let canvas2 = document.createElement("canvas")
        canvas2.width=this.config.width
        canvas2.height=this.config.height            
        canvasdiv2.appendChild(canvas2)
        this.canvas2 = canvas2
        this.ctx2 = this.canvas2.getContext("2d")

        document.getElementById("canvas_holder").appendChild(canvasdiv)
        document.getElementById("canvas_holder").appendChild(canvasdiv2)
        
        this.canvases = [this.ctx, this.ctx2]
    }

    build_quadtree(cap){
        let master_Border = new Border(this.left,this.top,this.config.chamber_size,this.config.chamber_size); 
        this.qt = new QuadTree(master_Border, cap)
        this.qt.insert_points(this.cells)        
    }

    // draw_chamberwalls
    draw_chamber(){
        for(let c of this.canvases){
            // this.ctx.strokeRect(0,0,this.width,this.height)   
            c.fillStyle = "#DDDDDD"        
            c.fillRect(0,0,this.left,this.bottom)
            c.fillRect(this.right,0,this.left,this.bottom)
            c.fillRect(0,0,this.width,this.top)
            c.strokeStyle = 'black';        
            c.lineWidth = 10
            this.ctx.strokeStyle = "black";
            this.ctx.lineWidth=2;
            // this.ctx.strokeRect(rect.left_bound,rect.top_bound,rect.w,rect.h)
        }
    }

    draw_quadtree(){
        this.qt.draw(this.ctx)
    }

    draw_cells(){        
        this.ctx.fillStyle="white"
        this.ctx.fillRect(0,0,this.width,this.height)
        this.ctx.lineWidth=3
        this.ctx.strokeStyle = "black"
        for(let c of this.cells){
            let fillcol = c.type == 1 ? "rgb(200,200,0)" : "rgb(0,0,255)"
            if(!c.in_chamber) this.ctx.globalAlpha = 0.3;            
            else this.ctx.globalAlpha=0.8
            this.ctx.fillStyle = fillcol   
            this.ctx.beginPath()            
            this.ctx.arc(c.x,c.y,c.size,0,2 * Math.PI)  
            this.ctx.fill()
            let blackness = 1-(c.growthrate*2)
            this.ctx.fillStyle = "rgba(0,0,0,"+blackness+")"
            this.ctx.beginPath()
            this.ctx.arc(c.x,c.y,c.size,0,2 * Math.PI)  
            this.ctx.fill()     
            this.ctx.closePath()                           
        }
        this.ctx.globalAlpha=1.0
        this.ctx.lineWidth=1;
    }

    draw_metabolites(){
        this.ctx2.fillRect(0,0,this.width,this.height)
        this.ctx2.fillStyle="white"
        
        var id = this.ctx2.getImageData(0, 0, this.width, this.height);
        var pixels = id.data;        

        for(let i = 0; i < this.width/this.scale; i++){            
            for(let j = 0; j < this.height/this.scale; j++){         
                if(!this.grid[i][j]) {
                    continue
                }
                for (let n = 0; n < this.scale; n++) {
                    for (let m = 0; m < this.scale; m++) {
                        let x = i*this.scale + n 
                        let y = j*this.scale + m
                        var off = (y * id.width + x) * 4;
                        var scale = 10
                        if(window['metabolite_display'] == 'R') scale = 10
                        var col = Math.floor(this.grid[i][j][window['metabolite_display']]*scale)               
                        pixels[off] = this.viridis[Math.max(0,Math.min(col,this.viridis.length-1))][0]
                        pixels[off + 1] = this.viridis[Math.max(0,Math.min(col,this.viridis.length-1))][1]
                        pixels[off + 2] = this.viridis[Math.max(0,Math.min(col,this.viridis.length-1))][2]
                    }
                }

                
            }
        }
        this.ctx2.putImageData(id, 0, 0); 

    }

    // Deprecated, hiermee kon je cellen binnen range een style geven. Niet moeilijk om te repareren :)
    draw_mouseover(rect){
        let cells_in_range = this.qt.getpoints(rect)        
        for(let c of cells_in_range){
            if(mouseDown) this.cells.splice(this.cells.indexOf(c),1)    
            this.ctx.lineWidth=2
            this.ctx.strokeStyle="white"
            this.ctx.beginPath()
            this.ctx.arc(c.x,c.y,c.size,0,2 * Math.PI)  
            this.ctx.stroke()
        }
    } 

    update(){
        // update cells
        let left = (this.width - this.config.chamber_size)/2
        let top = (this.height - this.config.chamber_size)/2
        let bottom = this.height - left
        let right = this.width - top

        // reset overlaps to 0
        for(let c of this.cells) c.overlaps = 0
        

        for(let c of this.cells){ 
            c.growthrate= 0.0
            if(c.y >= bottom){      
               c.in_chamber = false
               c.acceleration = 1.5
            }   
            
            this.x_speed = 0.01*this.config.temperature*(Math.random()-0.5)    // brownian motion
            this.y_speed = 0.01*this.config.temperature*(Math.random()-0.5)    // brownian motion     
              
            if(!c.in_chamber) {       
               // if(c.y>=this.bottom) this.cells.splice(this.cells.indexOf(c),1)         
                if(c.x+c.size >= this.width) {
                    this.cells.splice(this.cells.indexOf(c),1)
                    continue
                }
                c.acceleration = c.acceleration*c.acceleration
                this.x_speed += Math.random()*5*c.acceleration
                this.y_speed += Math.random()*1*c.acceleration
                c.size-=.05
                if(c.size <= 0) this.cells.splice(this.cells.indexOf(c),1)                
            }
            else{
                
                let x_on_grid = Math.ceil(c.x/this.scale)
                let y_on_grid = Math.ceil(c.y/this.scale)
                if(this.coords_in_chamber(x_on_grid, y_on_grid, this.scale)) {
                    let uptake = this.grid[x_on_grid][y_on_grid].R * 0.01* (1-c.resources/(c.resources+0.1)) 
                    this.grid[x_on_grid][y_on_grid].R -= uptake
                    c.resources += uptake
                
                    if(c.type==1) {     
                        let fract_converted = 0.5* c.resources
                        c.BB1 += fract_converted*150
                        c.resources -= fract_converted
                        
                        let leak = c.BB1 *0.01
                        this.grid[x_on_grid][y_on_grid].BB1 += leak
                        c.BB1 -= leak

                        let upBB2 = this.grid[x_on_grid][y_on_grid].BB2 / (c.BB2+1)
                        c.BB2 += upBB2
                        this.grid[x_on_grid][y_on_grid].BB2 -= upBB2
                    }
                    if(c.type==2) {
                        let fract_converted = 0.5 * c.resources
                        c.BB2 += fract_converted*150
                        c.resources-= fract_converted

                        let leak = c.BB2 *0.01
                        this.grid[x_on_grid][y_on_grid].BB2 += leak
                        c.BB2 -= leak
                        
                        let upBB1 = this.grid[x_on_grid][y_on_grid].BB1 / (c.BB1+1)
                        c.BB1 += upBB1
                        this.grid[x_on_grid][y_on_grid].BB1 -= upBB1
                    }
                    
                }                

                if(c.x-c.size <= left) this.x_speed += left-(c.x-c.size)+this.config.shoving_force
                if(c.y-c.size <= top) this.y_speed += top-(c.y-c.size)+this.config.shoving_force
                if(c.x+c.size >= right) this.x_speed -= (c.x+c.size)-right+this.config.shoving_force
            }
            
            let neighbourhood = new Border(c.x-c.size*this.config.interaction_range,c.y-c.size*this.config.interaction_range,c.size*this.config.interaction_range*2,c.size*this.config.interaction_range*2)
            let cells_in_range = this.qt.getpoints(neighbourhood)
            
            for(let c2 of cells_in_range){                
                if(c2 == c || !c.in_chamber || !c2.in_chamber) {
                    continue
                }
                //let dx = (c.x + c.size) - (c2.x + c2.size)
                //let dy = (c.y + c.size) - (c2.y + c2.size)
                let dx = (c.x) - (c2.x)
                let dy = (c.y) - (c2.y)
                let dist = Math.sqrt( dx * dx + dy * dy )    

                if(dist < (c.size + c2.size) ) {
                    this.x_speed += this.config.shoving_force*(c.x - c2.x)*(c2.size*2.0-dist) 
                    this.y_speed += this.config.shoving_force*(c.y - c2.y)*(c2.size*2.0-dist) 
                    c.overlaps++
                }                     
            }
            
            c.growthrate += ((c.BB1 * c.BB2 ) / ((c.BB1 * c.BB2 )+1.0) ) * 0.99 // deze slaat nergens op
            

            c.BB1 *= 1-c.growthrate
            c.BB2 *= 1-c.growthrate
            c.biomass += c.growthrate
                       
            c.x += this.x_speed*(0.2*c.overlaps+1) // ik weet niet of je hier overlaps wil gebruiken of niet. 
            c.y += this.y_speed*(0.2*c.overlaps+1)
            
            //if(c.in_chamber && c.overlaps < 3 && c.biomass>10 && this.cells.length < this.max_cells) { // hier weet ik ook niet overlaps gebruiken?
            if(c.in_chamber && c.overlaps <= 2 && c.biomass>50 && this.cells.length < this.max_cells) { // hier weet ik ook niet overlaps gebruiken?
                let newcell = new Cell(c) 
                this.cells.push(newcell)
            }
           
        }
    }

    update_grid(){
        let diff_R = 0.2
        let diff_BB1 = 0.2
        let diff_BB2 = 0.2
        let decay_R = 0.001
        let decay_BB = 0.001

        for(let i = 0; i < (this.width/this.scale); i++)   {      
            this.next_grid[i] = []
            for(let j = 0; j < (this.height/this.scale); j++){                            
                if(this.grid[i][j]) {            
                    this.next_grid[i][j] = {R:this.grid[i][j].R*(1-decay_R), BB1:this.grid[i][j].BB1*(1-decay_BB), BB2:this.grid[i][j].BB2*(1-decay_BB)}
                    if(i<=1) this.next_grid[i][j].R = 10
                    if(i>=(this.width/this.scale)-1) this.next_grid[i][j].R = 0
                }
            }
        }
            
        for(let i = 0; i < (this.width/this.scale); i++){
            for(let j = 0; j < (this.height/this.scale); j++){
                if(!this.grid[i][j]) continue
                this.laplace(i,j,'R',diff_R)
                this.laplace(i,j,'BB1',diff_BB1)
                this.laplace(i,j,'BB2',diff_BB2)
                
            }
        }

        for(let i = 0; i < (this.width/this.scale); i++)         
            for(let j = 0; j < (this.height/this.scale); j++){
                if(this.grid[i][j]){
                    this.grid[i][j] = {}
                    this.grid[i][j].R = this.next_grid[i][j].R
                    this.grid[i][j].BB1 = this.next_grid[i][j].BB1
                    this.grid[i][j].BB2 = this.next_grid[i][j].BB2

                    // Lateral flow
                    if(i>0 && j >this.bottom/this.scale && this.coords_in_chamber(i,j,this.scale)) {
                        this.grid[i][j].R = this.next_grid[i-1][j].R                        
                        this.grid[i][j].BB1 = this.next_grid[i-1][j].BB1                        
                        this.grid[i][j].BB2 = this.next_grid[i-1][j].BB2                        
                    }
                } 
            }
            
    }

    laplace(i,j,metab,d){
        if(i>0 && this.grid[i-1][j]){
            let amount = this.grid[i-1][j][metab]*d
            this.next_grid[i][j][metab] += amount
            this.next_grid[i-1][j][metab] -= amount
        }
        if(i+1<this.width/this.scale && this.next_grid[i+1][j]){
            let amount = this.grid[i+1][j][metab]*d
            this.next_grid[i][j][metab] += amount
            this.next_grid[i+1][j][metab] -= amount
        } 
        if(j>0 && this.grid[i][j-1]){
            let amount = this.grid[i][j-1][metab]*d
            this.next_grid[i][j][metab] += amount
            this.next_grid[i][j-1][metab] -= amount
        } 
        if(j+1<this.height/this.scale && this.next_grid[i][j+1]){
            let amount = this.grid[i][j+1][metab]*d
            this.next_grid[i][j][metab] += amount
            this.next_grid[i][j+1][metab] -= amount
        }
         
    }
}

class Cell{
    constructor(parent){
        this.id = generateCellID()
        let theta = Math.random()*360
        this.x = parent.x + parent.size*Math.cos(theta)
        this.y = parent.y + parent.size*Math.sin(theta)
        this.size = parent.size
        this.type = parent.type
        this.resources = parent.resources
        this.BB1 = parent.BB1
        this.BB2 = parent.BB2
        this.biomass = parent.biomass/2
        parent.biomass = parent.biomass/2
        this.fill = parent.fill
        this.growthrate = parent.growthrate
        this.x_speed = 0
        this.y_speed = 0
        this.overlaps = 0
        this.in_chamber = true
    }
}


/**
    * Get the position of the cursor on the canvas
    * @param {canvas} canvas A (constant) canvas object
    * @param {event-handler} event Event handler (mousedown)
    * @param {scale} scale The zoom (scale) of the grid to grab the correct grid point
    */
 function getCursorPosition(canvas, event, scale) {
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(Math.max(0, event.clientX - rect.left) / scale) 
    const y = Math.floor(Math.max(0, event.clientY - rect.top) / scale) 
    return({x:x,y:y})
}