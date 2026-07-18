use wasm_bindgen::prelude::*;

const DEAD: u8 = 0;
const ALIVE: u8 = 1;

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
    pub fn new(
        width: u32,
        height: u32,
        wrap_edges: bool,
        birth_mask: u16,
        survival_mask: u16,
    ) -> Universe {
        let size = (width * height) as usize;

        Universe {
            width,
            height,
            cells: vec![DEAD; size],
            next: vec![DEAD; size],
            wrap_edges,
            birth_mask,
            survival_mask,
        }
    }

    pub fn width(&self) -> u32 {
        self.width
    }

    pub fn height(&self) -> u32 {
        self.height
    }

    pub fn cells_ptr(&self) -> *const u8 {
        self.cells.as_ptr()
    }

    // The JavaScript API exposes a pointer-length pair rather than a Rust collection.
    #[allow(clippy::len_without_is_empty)]
    pub fn len(&self) -> usize {
        self.cells.len()
    }

    pub fn clear(&mut self) {
        self.cells.fill(DEAD);
    }

    pub fn randomize(&mut self, density: f64) {
        for cell in &mut self.cells {
            *cell = u8::from(js_sys::Math::random() < density);
        }
    }

    pub fn set_cell(&mut self, x: u32, y: u32, alive: bool) {
        if !self.contains(x, y) {
            return;
        }

        let index = self.index(x, y);
        self.cells[index] = u8::from(alive);
    }

    pub fn toggle_cell(&mut self, x: u32, y: u32) {
        if !self.contains(x, y) {
            return;
        }

        let index = self.index(x, y);
        self.cells[index] = u8::from(self.cells[index] == DEAD);
    }

    pub fn step(&mut self) {
        for y in 0..self.height {
            for x in 0..self.width {
                let index = self.index(x, y);
                let neighbors = self.live_neighbor_count(x as i32, y as i32);
                let mask = if self.cells[index] == ALIVE {
                    self.survival_mask
                } else {
                    self.birth_mask
                };
                self.next[index] = u8::from(mask & (1 << neighbors) != 0);
            }
        }

        std::mem::swap(&mut self.cells, &mut self.next);
    }

    fn contains(&self, x: u32, y: u32) -> bool {
        x < self.width && y < self.height
    }

    fn index(&self, x: u32, y: u32) -> usize {
        (y * self.width + x) as usize
    }

    fn live_neighbor_count(&self, x: i32, y: i32) -> u8 {
        let mut count = 0;
        let width = self.width as i32;
        let height = self.height as i32;

        for delta_y in -1..=1 {
            for delta_x in -1..=1 {
                if delta_x == 0 && delta_y == 0 {
                    continue;
                }

                let mut neighbor_x = x + delta_x;
                let mut neighbor_y = y + delta_y;

                if self.wrap_edges {
                    neighbor_x = (neighbor_x + width) % width;
                    neighbor_y = (neighbor_y + height) % height;
                } else if neighbor_x < 0
                    || neighbor_y < 0
                    || neighbor_x >= width
                    || neighbor_y >= height
                {
                    continue;
                }

                count += self.cells[self.index(neighbor_x as u32, neighbor_y as u32)];
            }
        }

        count
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const CONWAY_BIRTH: u16 = 1 << 3;
    const CONWAY_SURVIVAL: u16 = (1 << 2) | (1 << 3);

    fn universe(width: u32, height: u32, wrap_edges: bool) -> Universe {
        Universe::new(width, height, wrap_edges, CONWAY_BIRTH, CONWAY_SURVIVAL)
    }

    #[test]
    fn constructor_exposes_dimensions_length_and_dead_cell_bytes() {
        let universe = universe(3, 2, false);

        assert_eq!(universe.width(), 3);
        assert_eq!(universe.height(), 2);
        assert_eq!(universe.len(), 6);
        assert_eq!(universe.cells, vec![DEAD; 6]);
    }

    #[test]
    fn cell_edits_use_binary_bytes_and_ignore_out_of_bounds_coordinates() {
        let mut universe = universe(2, 2, false);

        universe.set_cell(1, 0, true);
        universe.set_cell(2, 0, true);
        universe.set_cell(0, 2, true);
        assert_eq!(universe.cells, vec![DEAD, ALIVE, DEAD, DEAD]);

        universe.toggle_cell(1, 0);
        universe.toggle_cell(2, 0);
        universe.toggle_cell(0, 2);
        assert_eq!(universe.cells, vec![DEAD; 4]);

        universe.cells[0] = 2;
        universe.toggle_cell(0, 0);
        assert_eq!(universe.cells[0], DEAD);
    }

    #[test]
    fn clear_preserves_the_cell_buffer_and_resets_every_byte() {
        let mut universe = universe(2, 2, false);
        universe.cells.fill(ALIVE);
        let cells_ptr = universe.cells_ptr();

        universe.clear();

        assert_eq!(universe.cells_ptr(), cells_ptr);
        assert_eq!(universe.len(), 4);
        assert_eq!(universe.cells, vec![DEAD; 4]);
    }

    #[test]
    fn step_swaps_between_the_two_stable_cell_buffers() {
        let mut universe = universe(3, 3, false);
        let first_buffer = universe.cells_ptr();

        universe.step();
        let second_buffer = universe.cells_ptr();
        universe.step();

        assert_ne!(second_buffer, first_buffer);
        assert_eq!(universe.cells_ptr(), first_buffer);
        assert_eq!(universe.len(), 9);
    }

    #[test]
    fn block_still_life_survives() {
        let mut universe = universe(4, 4, false);
        universe.set_cell(1, 1, true);
        universe.set_cell(2, 1, true);
        universe.set_cell(1, 2, true);
        universe.set_cell(2, 2, true);
        let before = universe.cells.clone();

        universe.step();

        assert_eq!(before, universe.cells);
    }

    #[test]
    fn blinker_oscillates() {
        let mut universe = universe(5, 5, false);
        universe.set_cell(2, 1, true);
        universe.set_cell(2, 2, true);
        universe.set_cell(2, 3, true);

        universe.step();

        assert_eq!(
            universe.cells,
            vec![
                DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, ALIVE, ALIVE,
                ALIVE, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD, DEAD,
            ]
        );
    }

    #[test]
    fn step_applies_birth_and_survival_masks_independently() {
        let mut universe = Universe::new(3, 3, false, 1 << 0, 1 << 0);
        universe.set_cell(1, 1, true);

        universe.step();

        assert_eq!(
            universe.cells,
            vec![DEAD, DEAD, DEAD, DEAD, ALIVE, DEAD, DEAD, DEAD, DEAD]
        );
    }

    #[test]
    fn wrapping_changes_edge_neighbors_without_changing_iteration_order() {
        let mut bounded = Universe::new(3, 3, false, 1 << 1, 0);
        let mut wrapped = Universe::new(3, 3, true, 1 << 1, 0);
        bounded.set_cell(0, 0, true);
        wrapped.set_cell(0, 0, true);

        bounded.step();
        wrapped.step();

        assert_eq!(
            bounded.cells,
            vec![DEAD, ALIVE, DEAD, ALIVE, ALIVE, DEAD, DEAD, DEAD, DEAD]
        );
        assert_eq!(
            wrapped.cells,
            vec![DEAD, ALIVE, ALIVE, ALIVE, ALIVE, ALIVE, ALIVE, ALIVE, ALIVE]
        );
    }
}
