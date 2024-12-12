import gleam/dynamic
import gleam/javascript/array.{type Array}
import gleam/list
import gleam/option.{type Option, None, Some}
import gleam/result
import lustre
import lustre/attribute
import lustre/effect.{type Effect}
import lustre/event
import sketch
import sketch/lustre as sketch_lustre
import sketch/lustre/element
import sketch/lustre/element/html
import sketch/size

// MAIN ------------------------------------------------------------------------

pub fn main() {
  let assert Ok(cache) = sketch.cache(strategy: sketch.Ephemeral)
  sketch_lustre.node()
  |> sketch_lustre.compose(view, cache)
  |> lustre.application(init, update, _)
  |> lustre.start("#app", Nil)
}

// MODEL -----------------------------------------------------------------------
type Model {
  Model(
    kanban: Option(List(Option(List(String)))),
    new_task_input: String,
    // text_editor_content: String,
  )
}

fn read_localstorage(key: String) -> Effect(Msg) {
  effect.from(fn(dispatch) {
    do_read_localstorage(key)
    |> CacheUpdatedMessage
    |> dispatch
  })
}

@external(javascript, "./storage.ffi.ts", "read_local_storage")
fn do_read_localstorage(_key: String) -> Result(Array(Array(String)), Nil) {
  Error(Nil)
}

fn write_localstorage(key: String, value: Array(Array(String))) -> Effect(msg) {
  effect.from(fn(_) { do_write_localstorage(key, value) })
}

@external(javascript, "./storage.ffi.ts", "write_local_storage")
fn do_write_localstorage(_key: String, _value: Array(Array(String))) -> Nil {
  Nil
}

fn init(_flags) -> #(Model, Effect(Msg)) {
  #(
    Model(
      kanban: None,
      new_task_input: "",
      // text_editor_content: "<h1>hello</h1>",
    ),
    read_localstorage("kanban"),
  )
}

///  Option(List(Option(List(String))))
// UPDATE ----------------------------------------------------------------------

pub opaque type Msg {
  UpdateNewTask(String)
  AddBoard
  DeleteBoard(String)

  AddTask(String)
  DeleteTask(String, String)
  CacheUpdatedMessage(Result(Array(Array(String)), Nil))
  UserUpdatedContent(Option(List(Option(List(String)))))
}

fn update(model: Model, msg: Msg) {
  case msg {
    UserUpdatedContent(kanban) -> #(
      Model(..model, kanban: kanban),
      effect.none(),
    )

    CacheUpdatedMessage(Ok(kanban)) -> #(
      Model(
        ..model,
        kanban: Some(
          kanban
          |> array.map(fn(array) { Some(array.to_list(array)) })
          |> array.to_list,
        ),
      ),
      effect.none(),
    )

    CacheUpdatedMessage(Error(_)) -> #(model, effect.none())

    UpdateNewTask(value) -> #(
      Model(..model, new_task_input: value),
      effect.none(),
    )
    DeleteTask(kanban_board_name, task) -> {
      #(
        Model(..model, kanban: delete_task(model, task, kanban_board_name)),
        write_localstorage(
          "kanban",
          delete_task(model, task, kanban_board_name)
            |> option.lazy_unwrap(fn() { [None] })
            |> list.map(fn(sublist) {
              array.from_list(sublist |> option.lazy_unwrap(fn() { [] }))
            })
            |> array.from_list,
        ),
      )
    }
    DeleteBoard(kanban_board_name) -> {
      #(
        Model(..model, kanban: delete_board(model, kanban_board_name)),
        write_localstorage(
          "kanban",
          delete_board(model, kanban_board_name)
            |> option.lazy_unwrap(fn() { [None] })
            |> list.map(fn(sublist) {
              array.from_list(sublist |> option.lazy_unwrap(fn() { [] }))
            })
            |> array.from_list,
        ),
      )
    }
    AddTask(kanban_board_name) ->
      case model.new_task_input {
        "" -> #(model, effect.none())

        _ -> {
          case does_task_exist(model, model.new_task_input) {
            True -> #(model, effect.none())
            _ -> #(
              Model(..model, kanban: add_task(model, kanban_board_name)),
              write_localstorage(
                "kanban",
                add_task(model, kanban_board_name)
                  |> option.lazy_unwrap(fn() { [None] })
                  |> list.map(fn(sublist) {
                    array.from_list(sublist |> option.lazy_unwrap(fn() { [] }))
                  })
                  |> array.from_list,
              ),
            )
          }
        }
      }
    AddBoard ->
      case model.new_task_input {
        "" -> #(model, effect.none())
        _ ->
          case does_board_exist(model, model.new_task_input) {
            True -> #(model, effect.none())

            _ -> #(
              Model(..model, kanban: add_board(model)),
              write_localstorage(
                "kanban",
                add_board(model)
                  |> option.lazy_unwrap(fn() { [None] })
                  |> list.map(fn(sublist) {
                    array.from_list(sublist |> option.lazy_unwrap(fn() { [] }))
                  })
                  |> array.from_list,
              ),
            )
          }
      }
  }
}

fn does_board_exist(model: Model, board_name: String) {
  model.kanban
  |> option.lazy_unwrap(fn() { [None] })
  |> list.any(fn(sublist) {
    case option.lazy_unwrap(sublist, fn() { [] }) {
      [first, _] -> first == board_name
      _ -> False
    }
  })
}

fn does_task_exist(model: Model, task_name: String) {
  model.kanban
  |> option.lazy_unwrap(fn() { [None] })
  |> list.any(fn(sublist) {
    option.lazy_unwrap(sublist, fn() { [] })
    |> list.any(fn(task) { task == task_name })
  })
}

fn add_task(
  model: Model,
  board_name: String,
) -> Option(List(Option(List(String)))) {
  Some(
    model.kanban
    |> option.lazy_unwrap(fn() { [None] })
    |> list.map(fn(sublist) {
      case list.first(sublist |> option.lazy_unwrap(fn() { [] })) {
        Ok(head) if head == board_name ->
          Some(
            sublist
            |> option.lazy_unwrap(fn() { [] })
            |> list.append([model.new_task_input]),
          )
        _ -> Some(sublist |> option.lazy_unwrap(fn() { [] }))
      }
    }),
  )
}

fn add_board(model: Model) -> Option(List(Option(List(String)))) {
  Some(
    model.kanban
    |> option.lazy_unwrap(fn() { [None] })
    |> list.append([Some([model.new_task_input])]),
  )
}

fn delete_board(
  model: Model,
  deleted_board_name: String,
) -> Option(List(Option(List(String)))) {
  Some(
    model.kanban
    |> option.lazy_unwrap(fn() { [None] })
    |> list.map(fn(sublist) {
      case list.first(sublist |> option.lazy_unwrap(fn() { [] })) {
        Ok(head) if head == deleted_board_name -> None
        _ -> sublist
      }
    })
    |> list.filter(fn(board) { board != None }),
  )
}

fn delete_task(
  model: Model,
  deleted_task_name: String,
  board_name: String,
) -> Option(List(Option(List(String)))) {
  Some(
    model.kanban
    |> option.lazy_unwrap(fn() { [None] })
    |> list.map(fn(sublist) {
      case list.first(sublist |> option.lazy_unwrap(fn() { [] })) {
        Ok(head) if head == board_name ->
          Some(
            sublist
            |> option.lazy_unwrap(fn() { [] })
            |> list.filter(fn(task) { task != deleted_task_name }),
          )

        _ -> sublist
      }
    }),
  )
}

// VIEW ------------------------------------------------------------------------
fn block_title() {
  sketch.class([
    sketch.font_size(size.rem(2.0)),
    // Larger text for block titles
    sketch.font_weight("bold"),
    // Makes the title bold
    sketch.margin_("0 0 1.5rem 0"),
    // Adds spacing below the title
    sketch.color("#F7F7F7"),
    // Caribbean Current for title text
    sketch.text_align("center"),
    // Centers the text

    sketch.letter_spacing("0.1rem"),
    // Adds spacing between letters for style
  ])
}

fn container() {
  sketch.class([
    sketch.display("flex"),
    sketch.flex_direction("column"),
    sketch.align_items("center"),
    // Centers the content horizontally
    sketch.margin_("auto"),
    // Centers the container
    sketch.padding(size.rem(2.0)),
    // Padding inside the container
    sketch.width(size.percent(90)),
    // Responsive width
    sketch.max_width(size.rem(80.0)),
    // Maximum width for large screens
    sketch.background_color("#001524"),
    // Isabelline background
    sketch.border_radius(size.rem(1.0)),
    sketch.box_shadow("0 8px 16px rgba(0, 0, 0, 0.1)"),
    // Stronger shadow for depth
  ])
}

fn kanban_board_container() {
  sketch.class([
    sketch.overflow_x("auto"),
    // Enables horizontal scrolling
    sketch.white_space("nowrap"),
    // Prevents wrapping of blocks
    sketch.padding(size.rem(1.5)),
    // Adds padding around the scrolling area
    sketch.width(size.percent(100)),
  ])
}

fn kanban_board() {
  sketch.class([
    sketch.display("flex"),
    sketch.flex_direction("row"),
    sketch.gap(size.rem(2.5)),
    // Space between kanban blocks
  ])
}

fn kanban_block() {
  sketch.class([
    sketch.background_color("#2A3D45"),
    // Bright white background for blocks
    sketch.padding(size.rem(2.0)),
    // Padding for content
    sketch.width(size.rem(22.0)),
    // Fixed width for blocks
    sketch.flex_shrink(0.0),
    // Prevents shrinking in flex
    sketch.border_radius(size.rem(0.8)),
    // Rounded corners
    sketch.box_shadow("0 4px 8px rgba(0,0,0,0.1)"),
    // Subtle shadow
    sketch.display("flex"),
    sketch.flex_direction("column"),
    sketch.gap(size.rem(1.5)),
    // Space between tasks inside the block
    sketch.hover([sketch.box_shadow("0 6px 12px rgba(0,0,0,0.15)")]),
  ])
}

fn task() {
  sketch.class([
    sketch.text_align("center"),
    sketch.font_size(size.rem(1.5)),
    sketch.background_color("#F7F7F7"),
    // Task background color
    sketch.border("0.1rem solid #ddd"),
    // Subtle border
    sketch.border_radius(size.rem(0.4)),
    // Rounded corners
    sketch.padding(size.rem(1.0)),
    // Padding inside the task
    sketch.margin_("0.5rem 0"),
    // Space between tasks
    sketch.box_shadow("0 1px 3px rgba(0,0,0,0.1)"),
    // Subtle shadow
    sketch.transition("transform 0.2s ease, box-shadow 0.2s ease"),
    // Smooth hover effect
    sketch.hover([
      sketch.transform("scale(1.02)"),
      // Slight grow on hover
      sketch.box_shadow("0 6px 12px rgba(0,0,0,0.2)"),
      // Prominent shadow on hover
    ]),
    sketch.overflow("hidden"),
    // Prevents text overflow outside the task box
    sketch.text_overflow("ellipsis"),
    // Adds ellipsis for truncated text
    sketch.white_space("normal"),
    // Allows text to wrap to the next line
    // sketch.max_height(size.rem(4.0)),
    // Optional: Set max height to prevent excessively tall tasks
    sketch.line_height("1.8rem"),
    // Adjusts spacing between lines for readability
  ])
}

fn add_task_input() {
  sketch.class([
    sketch.background_color("#F7F7F7"),
    sketch.border("0.1rem solid #ccc"),
    sketch.border_radius(size.rem(0.4)),
    sketch.padding(size.rem(0.8)),
    sketch.margin_("0.5rem 0"),
    sketch.box_shadow("0 1px 3px rgba(0,0,0,0.1)"),
    sketch.font_size(size.rem(1.5)),
  ])
}

//  fn tiptap() {
//   sketch.class([
//     sketch.background_color("#F7F7F7"),
//     sketch.border("0.1rem solid #ccc"),
//     sketch.border_radius(size.rem(0.4)),
//     sketch.padding(size.rem(0.8)),
//     sketch.margin_("0.5rem 0"),
//     sketch.box_shadow("0 1px 3px rgba(0,0,0,0.1)"),
//     sketch.font_size(size.rem(1.5)),
//   ])
// }

fn add_task_button() {
  sketch.class([
    sketch.background_color("#4B8F6A"),
    sketch.font_size(size.rem(1.5)),
    sketch.color("#fff"),
    sketch.border("none"),
    sketch.border_radius(size.rem(0.4)),
    sketch.padding(size.rem(0.8)),
    sketch.margin_("0.5rem 0"),
    sketch.text_align("center"),
    sketch.font_weight("bold"),
    sketch.cursor("pointer"),
    sketch.transition("transform 0.2s ease, background-color 0.2s ease"),
    sketch.hover([
      sketch.background_color("#4B8F8C"),
      sketch.transform("scale(1.05)"),
    ]),
  ])
}

fn add_board_button() {
  sketch.class([
    sketch.background_color("#4B8F6A"),
    sketch.font_size(size.rem(1.5)),
    sketch.color("#fff"),
    sketch.border("none"),
    sketch.border_radius(size.rem(0.4)),
    sketch.padding(size.rem(4.0)),
    sketch.margin_("0.5rem 0"),
    sketch.text_align("center"),
    sketch.font_weight("bold"),
    sketch.cursor("pointer"),
    sketch.transition("transform 0.2s ease, background-color 0.2s ease"),
    sketch.hover([
      sketch.background_color("#4B8F8C"),
      sketch.transform("scale(1.05)"),
    ]),
  ])
}

fn delete_task_button() {
  sketch.class([
    sketch.display("inline-flex"),
    sketch.align_items("center"),
    sketch.justify_content("center"),
    sketch.background_color("transparent"),
    sketch.color("#FF5C5C"),
    sketch.border("0.1rem solid #FF5C5C"),
    sketch.border_radius(size.rem(0.5)),
    sketch.padding_("0.3rem 0.6rem"),
    sketch.margin_("0 0 0 0.5rem"),
    sketch.cursor("pointer"),
    sketch.font_size(size.rem(1.0)),
    sketch.font_weight("bold"),
    sketch.transition(
      "background-color 0.3s ease, color 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease",
    ),
    sketch.box_shadow("0 2px 4px rgba(0, 0, 0, 0.1)"),
    sketch.hover([
      sketch.background_color("#FF5C5C"),
      sketch.color("#FFFFFF"),
      sketch.box_shadow("0 4px 8px rgba(0, 0, 0, 0.2)"),
      sketch.transform("scale(1.1)"),
    ]),
    sketch.focus([
      sketch.outline("none"),
      sketch.box_shadow("0 0 0 0.2rem rgba(255, 92, 92, 0.5)"),
    ]),
  ])
}

fn view(model: Model) {
  let content_updated = fn(event) -> Result(Msg, List(dynamic.DecodeError)) {
    use detail <- result.try(dynamic.field("detail", dynamic.dynamic)(event))
    use kanban <- result.try(dynamic.field(
      "kanban",
      dynamic.list(dynamic.optional(dynamic.list(dynamic.string))),
    )(detail))

    Ok(UserUpdatedContent(Some(kanban)))
  }

  html.div(
    container(),
    [
      attribute.id("websocket_element"),
      event.on("content-updated", content_updated),
    ],
    [
      html.div(kanban_board_container(), [], [
        html.div(kanban_board(), [], [
          element.fragment(
            model.kanban
            |> option.lazy_unwrap(fn() { [None] })
            |> list.map(fn(task_item) {
              kanaban_board_element(
                task_item
                  |> option.lazy_unwrap(fn() { [] })
                  |> list.first
                  |> result.lazy_unwrap(fn() { "" }),
                model,
                Some(
                  task_item
                  |> option.lazy_unwrap(fn() { [] })
                  |> list.filter(fn(t) {
                    t
                    != task_item
                    |> option.lazy_unwrap(fn() { [] })
                    |> list.first
                    |> result.lazy_unwrap(fn() { "" })
                  }),
                ),
              )
            }),
          ),
          html.div(kanban_block(), [], [
            html.div(block_title(), [], [html.text("قم بإضافة قائمة")]),
            html.input(add_task_input(), [
              attribute.type_("text"),
              attribute.value(model.new_task_input),
              event.on_input(UpdateNewTask),
            ]),
            html.button(add_board_button(), [event.on_click(AddBoard)], [
              html.text("أضف قائمة"),
            ]),
          ]),
        ]),
      ]),
      // element.element(
    //   "tiptap-editor",
    //   sketch.class([]),
    //   [
    //     // attribute.attribute("content", model.text_editor_content),
    //   // event.on("content-update", content_updated),
    //   ],
    //   [],
    // ),
    ],
  )
}

fn kanaban_board_element(
  title: String,
  model: Model,
  model_kanban: Option(List(String)),
) {
  html.div(kanban_block(), [], [
    html.div(block_title(), [], [html.text(title)]),
    html.button(delete_task_button(), [event.on_click(DeleteBoard(title))], [
      html.text("X"),
    ]),
    html.input(add_task_input(), [
      attribute.type_("text"),
      attribute.value(model.new_task_input),
      event.on_input(UpdateNewTask),
    ]),
    html.button(add_task_button(), [event.on_click(AddTask(title))], [
      html.text("أضف مهمة"),
    ]),
    element.fragment(
      model_kanban
      |> option.lazy_unwrap(fn() { [] })
      |> list.map(fn(task_item) {
        html.div(task(), [], [
          html.text(task_item),
          html.button(
            delete_task_button(),
            [event.on_click(DeleteTask(title, task_item))],
            [html.text("X")],
          ),
        ])
      }),
    ),
  ])
}
