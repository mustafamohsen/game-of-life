use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    cells: Vec<u8>,
    next: Vec<u8>,
    wrap_edges: bool,
    birth_mask: u16,
    survival_mask: u16,
}

#[wasm_bindgen]
impl Universe {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, wrap_edges: bool, birth_mask: u16, survival_mask: u16) -> Universe {
        let size = (width * height) as usize;
        Universe { width, height, cells: vec![0; size], next: vec![0; size], wrap_edges, birth_mask, survival_mask }
    }

    pub fn width(&self) -> u32 { self.width }
    pub fn height(&self) -> u32 { self.height }
    pub fn cells_ptr(&self) -> *const u8 { self.cells.as_ptr() }
    pub fn len(&self) -> usize { self.cells.len() }

    pub fn clear(&mut self) { self.cells.fill(0); }

    pub fn randomize(&mut self, density: f64) {
        for cell in self.cells.iter_mut() {
            *cell = if js_sys::Math::random() < density { 1 } else { 0 };
        }
    }

    pub fn set_cell(&mut self, x: u32, y: u32, alive: bool) {
        if x >= self.width || y >= self.height { return; }
        let idx = (y * self.width + x) as usize;
        self.cells[idx] = if alive { 1 } else { 0 };
    }

    pub fn toggle_cell(&mut self, x: u32, y: u32) {
        if x >= self.width || y >= self.height { return; }
        let idx = (y * self.width + x) as usize;
        self.cells[idx] = if self.cells[idx] == 0 { 1 } else { 0 };
    }

    pub fn step(&mut self) {
        for y in 0..self.height {
            for x in 0..self.width {
                let idx = (y * self.width + x) as usize;
                let neighbors = self.live_neighbor_count(x as i32, y as i32);
                let mask = if self.cells[idx] == 1 { self.survival_mask } else { self.birth_mask };
                self.next[idx] = if (mask & (1 << neighbors)) != 0 { 1 } else { 0 };
            }
        }
        std::mem::swap(&mut self.cells, &mut self.next);
    }

    fn live_neighbor_count(&self, x: i32, y: i32) -> u8 {
        let mut count = 0u8;
        let w = self.width as i32;
        let h = self.height as i32;
        for dy in -1..=1 {
            for dx in -1..=1 {
                if dx == 0 && dy == 0 { continue; }
                let mut nx = x + dx;
                let mut ny = y + dy;
                if self.wrap_edges {
                    nx = (nx + w) % w;
                    ny = (ny + h) % h;
                } else if nx < 0 || ny < 0 || nx >= w || ny >= h {
                    continue;
                }
                count += self.cells[(ny as u32 * self.width + nx as u32) as usize];
            }
        }
        count
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn block_still_life_survives() {
        let mut u = Universe::new(4, 4, false, 1 << 3, (1 << 2) | (1 << 3));
        u.set_cell(1,1,true); u.set_cell(2,1,true); u.set_cell(1,2,true); u.set_cell(2,2,true);
        let before = u.cells.clone();
        u.step();
        assert_eq!(before, u.cells);
    }

    #[test]
    fn blinker_oscillates() {
        let mut u = Universe::new(5, 5, false, 1 << 3, (1 << 2) | (1 << 3));
        u.set_cell(2,1,true); u.set_cell(2,2,true); u.set_cell(2,3,true);
        u.step();
        assert_eq!(u.cells[(2 * 5 + 1) as usize], 1);
        assert_eq!(u.cells[(2 * 5 + 2) as usize], 1);
        assert_eq!(u.cells[(2 * 5 + 3) as usize], 1);
    }
}
