// Image generation utilities for testing
//
// Provides functions to generate test images with equations

use image::{DynamicImage, ImageBuffer, Rgba, RgbaImage};
use imageproc::drawing::{draw_text_mut, draw_filled_rect_mut};
use imageproc::rect::Rect;
use rusttype::{Font, Scale};
use rand::Rng;

/// Generate a simple equation image
pub fn generate_simple_equation(equation: &str) -> DynamicImage {
    let width = 400;
    let height = 100;

    // Create white background
    let mut image = RgbaImage::from_pixel(width, height, Rgba([255, 255, 255, 255]));

    // Load font (using a basic font, in real implementation would use math font)
    let font_data = include_bytes!("../../assets/fonts/DejaVuSans.ttf");
    let font = Font::try_from_bytes(font_data as &[u8])
        .unwrap_or_else(|| panic!("Error loading font"));

    let scale = Scale::uniform(32.0);
    let color = Rgba([0, 0, 0, 255]);

    // Draw text
    draw_text_mut(&mut image, color, 20, 30, scale, &font, equation);

    DynamicImage::ImageRgba8(image)
}

/// Generate a fraction image
pub fn generate_fraction(numerator: i32, denominator: i32) -> DynamicImage {
    let width = 200;
    let height = 150;

    let mut image = RgbaImage::from_pixel(width, height, Rgba([255, 255, 255, 255]));

    let font_data = include_bytes!("../../assets/fonts/DejaVuSans.ttf");
    let font = Font::try_from_bytes(font_data as &[u8]).unwrap();

    let scale = Scale::uniform(28.0);
    let color = Rgba([0, 0, 0, 255]);

    // Draw numerator
    draw_text_mut(&mut image, color, 85, 30, scale, &font, &numerator.to_string());

    // Draw fraction line
    draw_filled_rect_mut(
        &mut image,
        Rect::at(70, 65).of_size(60, 2),
        color
    );

    // Draw denominator
    draw_text_mut(&mut image, color, 80, 75, scale, &font, &denominator.to_string());

    DynamicImage::ImageRgba8(image)
}

/// Generate an integral image
pub fn generate_integral(integrand: &str) -> DynamicImage {
    let equation = format!(r"\int {}", integrand);
    generate_simple_equation(&equation)
}

/// Generate a symbol image
pub fn generate_symbol(symbol: &str) -> DynamicImage {
    generate_simple_equation(symbol)
}

/// Generate a blank image
pub fn generate_blank(width: u32, height: u32) -> DynamicImage {
    let image = RgbaImage::from_pixel(width, height, Rgba([255, 255, 255, 255]));
    DynamicImage::ImageRgba8(image)
}

/// Generate a complex equation
pub fn generate_complex_equation() -> DynamicImage {
    let equation = r"\sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}";
    generate_simple_equation(equation)
}

/// Add noise to an image
pub fn add_noise(image: &mut DynamicImage, intensity: f32) {
    let mut rng = rand::thread_rng();

    let rgba = image.as_mut_rgba8().unwrap();

    for pixel in rgba.pixels_mut() {
        for channel in 0..3 {
            let noise = rng.gen_range(-intensity..intensity) * 255.0;
            let new_value = (pixel[channel] as f32 + noise).clamp(0.0, 255.0) as u8;
            pixel[channel] = new_value;
        }
    }
}

/// Add slight variation to an image
pub fn add_slight_variation(image: &mut DynamicImage, amount: f32) {
    let mut rng = rand::thread_rng();

    let rgba = image.as_mut_rgba8().unwrap();

    for pixel in rgba.pixels_mut() {
        for channel in 0..3 {
            let variation = rng.gen_range(-amount..amount) * 255.0;
            let new_value = (pixel[channel] as f32 + variation).clamp(0.0, 255.0) as u8;
            pixel[channel] = new_value;
        }
    }
}

/// Generate a matrix image
pub fn generate_matrix(rows: usize, cols: usize) -> DynamicImage {
    let mut elements = String::new();
    for i in 0..rows {
        for j in 0..cols {
            elements.push_str(&format!("{} ", i * cols + j + 1));
            if j < cols - 1 {
                elements.push_str("& ");
            }
        }
        if i < rows - 1 {
            elements.push_str(r" \\ ");
        }
    }

    let equation = format!(r"\begin{{bmatrix}} {} \end{{bmatrix}}", elements);
    generate_simple_equation(&equation)
}
