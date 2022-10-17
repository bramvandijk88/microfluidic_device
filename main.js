var biofilm 

function setup(){

    let bio_cfg = {
        width: 500,
        height: 500,
        init_cells: 35,        
        max_cells: 100000,
        chamber_size: 400,
        cell_size: 5,
        temperature: 28,
        shoving_force: 0.03,        
        interaction_range: 6,
        initial_R: 1
    }

    biofilm = new Biofilm(bio_cfg)
    
    biofilm.initialise()
    biofilm.build_quadtree(10)
    biofilm.create_display()
    biofilm.draw_quadtree()

    let time = 0

    function animate() {
        
        biofilm.update()        
        for(let i=0; i < 1; i++ ) biofilm.update_grid()
        biofilm.build_quadtree(10)            
        biofilm.draw_mouseover(rect)                    
        biofilm.draw_metabolites()        
        biofilm.draw_cells()
        biofilm.draw_chamber()
        //biofilm.draw_quadtree()
       
        let frame = requestAnimationFrame(animate);    
        time++ 
        if(time > 100000){
            cancelAnimationFrame(frame)
            var endTime = performance.now()
            console.log(`Simulation finished in ${(endTime - startTime)/1000} seconds`)
        }
        
    }               
    var startTime = performance.now()
    requestAnimationFrame(animate);

    // while(time < 1000){
    //     biofilm.update()        
    //     for(let i=0; i < 1; i++ ) biofilm.update_grid()
    //     biofilm.build_quadtree(10)            
    //     biofilm.draw_mouseover(rect)                    
    //     biofilm.draw_metabolites()        
    //     biofilm.draw_cells()
    //     biofilm.draw_chamber()
    //     biofilm.draw_quadtree()
    //     time++ 
    // }
    
}