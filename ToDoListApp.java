import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.*;
import java.util.ArrayList;

public class ToDoListApp extends JFrame {
    private DefaultListModel<Task> taskListModel;
    private JList<Task> taskJList;
    private JTextField taskInputField;
    private JButton addButton, deleteButton, markDoneButton, clearAllButton;

    public ToDoListApp() {
        setTitle("📝 To-Do List App");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(500, 600);
        setLocationRelativeTo(null);
        setLayout(new BorderLayout());

        // Header
        JLabel titleLabel = new JLabel("My To-Do List", SwingConstants.CENTER);
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 26));
        titleLabel.setBorder(new EmptyBorder(15, 0, 15, 0));
        add(titleLabel, BorderLayout.NORTH);

        // Center panel for list
        taskListModel = new DefaultListModel<>();
        taskJList = new JList<>(taskListModel);
        taskJList.setFont(new Font("Segoe UI", Font.PLAIN, 16));
        taskJList.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        JScrollPane scrollPane = new JScrollPane(taskJList);
        scrollPane.setBorder(new EmptyBorder(10, 10, 10, 10));
        add(scrollPane, BorderLayout.CENTER);

        // Bottom panel for input + buttons
        JPanel inputPanel = new JPanel();
        inputPanel.setLayout(new GridLayout(2, 1, 5, 5));
        inputPanel.setBorder(new EmptyBorder(10, 10, 10, 10));

        // First row: input + add
        JPanel topRow = new JPanel(new BorderLayout(5, 5));
        taskInputField = new JTextField();
        addButton = new JButton("Add Task");
        addButton.setFont(new Font("Segoe UI", Font.BOLD, 14));
        addButton.setBackground(new Color(46, 204, 113));
        addButton.setForeground(Color.WHITE);
        addButton.setFocusPainted(false);
        topRow.add(taskInputField, BorderLayout.CENTER);
        topRow.add(addButton, BorderLayout.EAST);

        // Second row: actions
        JPanel bottomRow = new JPanel(new GridLayout(1, 3, 5, 5));
        markDoneButton = new JButton("Mark Done");
        deleteButton = new JButton("Delete");
        clearAllButton = new JButton("Clear All");

        JButton[] buttons = {markDoneButton, deleteButton, clearAllButton};
        Color[] colors = {new Color(52, 152, 219), new Color(231, 76, 60), new Color(155, 89, 182)};
        for (int i = 0; i < buttons.length; i++) {
            buttons[i].setFont(new Font("Segoe UI", Font.BOLD, 13));
            buttons[i].setBackground(colors[i]);
            buttons[i].setForeground(Color.WHITE);
            buttons[i].setFocusPainted(false);
            bottomRow.add(buttons[i]);
        }

        inputPanel.add(topRow);
        inputPanel.add(bottomRow);
        add(inputPanel, BorderLayout.SOUTH);

        // Action listeners
        addButton.addActionListener(e -> addTask());
        deleteButton.addActionListener(e -> deleteTask());
        markDoneButton.addActionListener(e -> markTaskDone());
        clearAllButton.addActionListener(e -> clearAllTasks());

        // Enter key adds task
        taskInputField.addActionListener(e -> addTask());

        setVisible(true);
    }

    private void addTask() {
        String text = taskInputField.getText().trim();
        if (text.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please enter a task!");
            return;
        }
        taskListModel.addElement(new Task(text));
        taskInputField.setText("");
    }

    private void deleteTask() {
        int index = taskJList.getSelectedIndex();
        if (index == -1) {
            JOptionPane.showMessageDialog(this, "Select a task to delete.");
            return;
        }
        taskListModel.remove(index);
    }

    private void markTaskDone() {
        int index = taskJList.getSelectedIndex();
        if (index == -1) {
            JOptionPane.showMessageDialog(this, "Select a task to mark done.");
            return;
        }
        Task task = taskListModel.get(index);
        task.setDone(true);
        taskListModel.set(index, task);
    }

    private void clearAllTasks() {
        if (taskListModel.isEmpty()) {
            JOptionPane.showMessageDialog(this, "No tasks to clear!");
            return;
        }
        int confirm = JOptionPane.showConfirmDialog(this, "Are you sure you want to clear all tasks?",
                "Confirm", JOptionPane.YES_NO_OPTION);
        if (confirm == JOptionPane.YES_OPTION) {
            taskListModel.clear();
        }
    }

    // Task inner class
    static class Task {
        private String text;
        private boolean done;

        public Task(String text) {
            this.text = text;
            this.done = false;
        }

        public void setDone(boolean done) {
            this.done = done;
        }

        @Override
        public String toString() {
            return done ? "✅ " + text : text;
        }
    }

    public static void main(String[] args) {
        // Make UI look modern
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception ignored) {}

        SwingUtilities.invokeLater(ToDoListApp::new);
    }
}
