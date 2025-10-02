fn main() {
    tauri_build::build();
    cynic_codegen::register_schema("srexam")
        .from_sdl_file("schemas/TPADesktop.graphqls")
        .unwrap()
        .as_default()
        .unwrap();
}
