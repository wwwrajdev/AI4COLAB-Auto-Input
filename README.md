# 💡 Auto Input Helper v2.0

Smart inline text suggestions with keyboard navigation and draggable feedback!

## ✨ New Features (v2.0)

### 🎯 Inline Suggestions
- Shows **2 suggestions** directly below input field
- Navigate with **← →** arrow keys
- Press **Enter** to accept
- Press **Esc** to dismiss

### 👍👎 Draggable Feedback
- After accepting suggestion, floating feedback button appears
- Like/Dislike buttons
- **Drag anywhere** on screen
- Auto-hides after 10 seconds

### 📊 Full Dashboard
- Manage all suggestions
- View liked/disliked items
- Add custom text
- Export/Import data
- Toggle t.txt file usage

## 🚀 How to Use

1. **Click on any input field** (empty)
2. **See 2 suggestions** appear below
3. **Navigate**: Press ← or → to select
4. **Accept**: Press Enter
5. **Feedback**: Drag the floating button and Like/Dislike

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **← Left Arrow** | Select previous suggestion (1st option) |
| **→ Right Arrow** | Select next suggestion (2nd option) |
| **Enter** | Accept selected suggestion |
| **Esc** | Dismiss suggestions |

## 📝 Add Custom Suggestions

**Method 1: Via Dashboard**
1. Click extension icon
2. Click "Open Dashboard"
3. Type/paste text in "Add New Suggestion" box
4. Click "Add to List"

**Method 2: Edit t.txt**
1. Open `t.txt`
2. Add one suggestion per line
3. Reload extension

## 🎨 Features

### Inline Suggestions
- Beautiful gradient purple/blue design
- Shows numbered options (1, 2)
- Selected option highlighted
- Smooth animations

### Floating Feedback Button
- Appears after accepting suggestion
- Fully draggable - position anywhere
- Like/Dislike with visual feedback
- Auto-closes after 10 seconds
- Manual close with ✕ button

### Dashboard
- **Stats**: Total, Liked, Disliked, Used
- **Tabs**: All/Liked/Disliked/Custom
- **Actions**: 
  - Copy liked text to clipboard
  - Export all data to JSON
  - Import from JSON
  - Delete individual suggestions
  - Clear all data

## 📦 Installation

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `folder`

## 🎯 Use Cases

- **Form Filling** - Quick autocomplete
- **Content Creation** - Repeated phrases
- **Testing** - Test data input
- **Search Queries** - Common searches
- **Email** - Template responses

## 🔧 Customization

**Toggle t.txt File:**
- Open Dashboard
- Check/Uncheck "Use t.txt file suggestions"
- When disabled, only custom suggestions appear

**Drag Feedback Button:**
- Grab the header (📝 Feedback)
- Drag to any position
- Position persists during session

## 💾 Export/Import

**Export:**
1. Open Dashboard
2. Click "📤 Export All"
3. Save JSON file

**Import:**
1. Open Dashboard
2. Click "📥 Import"
3. Select JSON file

## 🎨 Visual Design

- **Inline Box**: Gradient purple/blue, glassmorphism
- **Feedback Button**: Clean white card with draggable header
- **Animations**: Smooth slide-in, scale effects
- **Always on Top**: Z-index 2147483647

## 🔄 Workflow Example

```
1. Focus on input field
   ↓
2. See 2 suggestions appear
   ↓
3. Press → to select 2nd option
   ↓
4. Press Enter
   ↓
5. Input filled with text
   ↓
6. Floating button appears
   ↓
7. Drag to corner
   ↓
8. Click 👍 Like
   ↓
9. Button fades after 10s
```

## 📊 Dashboard Shortcuts

- **Copy Liked**: Copy all liked suggestions to clipboard
- **Export**: Download all data as JSON
- **Import**: Restore from JSON file
- **Delete**: Remove individual suggestions
- **Clear All**: Reset everything

## ⚡ Performance

- Lightweight (no dependencies)
- Fast inline rendering
- Smooth drag interactions
- Minimal DOM manipulation
- Efficient storage usage

---

**Version**: 2.0  
**Made with**: Vanilla JavaScript, Chrome APIs  
**License**: Free to use

Enjoy effortless text input! 💡
