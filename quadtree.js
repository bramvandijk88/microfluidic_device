class Point {
    constructor(x,y){
        this.x = x
        this.y = y
    }
}

class Border {
    constructor(x,y,w,h){
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.left_bound = this.x
        this.right_bound = this.x + this.w
        this.top_bound = this.y
        this.bot_bound = this.y + this.h

    }

    contains(point){
        return(point.x >= this.left_bound && 
               point.x <= this.right_bound &&
               point.y > this.top_bound &&
               point.y < this.bot_bound)
    }

    intersects(rect){
        let intersects = !(rect.x > this.x + this.w  ||             // Left edge of rect is RIGHT of this border's x post plus it's width, so no overlap
                          rect.x + rect.w < this.x  ||          // Right edge of rect is LEFT of this border's x pos, so no overlap
                          rect.y > this.y + this.h ||               // Top edge of rect is below this border's y pos, so no overlap
                          rect.y + rect.h < this.y)            // Bottom edge of rect is above this border's y pos, so no overlap
        return(intersects)
    }
}

class QuadTree {
    constructor(Border, capacity){
        this.border = Border
        this.capacity = capacity
        this.points = []
        this.divided = false
        this.linewidth = 1
        this.linecol = "grey"
    }
    insert_points(points){
        for (let point of points) this.insert(point)
    }

    insert(point){        
        if(!this.border.contains(point)) 
            return

        if(this.points.length < this.capacity){
            this.points.push(point)
        } else {
            if(!this.divided){
                this.subdivide()
            }

            this.northeast.insert(point)
            this.northwest.insert(point)
            this.southeast.insert(point)
            this.southwest.insert(point)
        }
    }

    subdivide(points){
        let x = this.border.x
        let y = this.border.y
        let w = this.border.w
        let h = this.border.h
        
        let NW = new Border(x,y,w/2,h/2)   // compass directions (NE=north east, NW=north west, etc)        
        let NE = new Border(x,y+w/2,w/2,h/2)
        let SW = new Border(x+w/2,y,w/2,h/2)
        let SE = new Border(x+w/2,y+h/2,w/2, h/2)
        
        this.northwest = new QuadTree(NW,this.capacity)
        this.northeast = new QuadTree(NE,this.capacity)
        this.southwest = new QuadTree(SW,this.capacity)
        this.southeast = new QuadTree(SE,this.capacity)
        
        this.divided = true
    }
    
    draw(ctx)
    {                
        ctx.strokeStyle = this.linecol;
        ctx.lineWidth=this.linewidth;   
             
        
        ctx.strokeRect(this.border.left_bound,this.border.top_bound,this.border.w,this.border.h)
        if(this.divided){
            this.northeast.draw(ctx)
            this.northwest.draw(ctx)
            this.southeast.draw(ctx)
            this.southwest.draw(ctx)
        }        
    }

    update(ctx){                        
        if(this.divided){
            this.northeast.update(ctx)
            this.northwest.update(ctx)
            this.southeast.update(ctx)
            this.southwest.update(ctx)
        }

        this.draw(ctx)

    }

    getpoints(rect, points){
        if(!points) points = []
        let intersect = this.border.intersects(rect)
        if(!intersect) return points

        if(intersect && !this.divided) {
            this.linewidth = 3
            this.linecol = "black"
        } else{
            this.linewidth = 1
            this.linecol = "grey"
        }
        
        if(intersect){            
            for(let p of this.points) {                
                if(rect.contains(p)){                    
                    points.push(p)
                }
            }
        }
         
        if(this.divided){
            this.northwest.getpoints(rect,points)
            this.northeast.getpoints(rect,points)
            this.southwest.getpoints(rect,points)
            this.southeast.getpoints(rect,points)
        }       

        return points 
    }

    
}