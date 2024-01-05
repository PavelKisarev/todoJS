let todos = [];
let users = [];
let todoList = document.querySelector("#todo-list");
let usersSelect = document.querySelector('#users-select');
let todoForm = document.querySelector('#todo-form');
let usersFilterSelect = document.querySelector('#filter-users-select');
let statusFilterSelect = document.querySelector('#filter-todo-status');
let searchInput = document.querySelector('#search');
let resetFilterButton = document.querySelector('#reset-filter-button');

document.addEventListener("DOMContentLoaded", initApplication);
todoForm.addEventListener('submit', handleSubmitNewTodo);
resetFilterButton.addEventListener('click', handleResetFilters);

usersFilterSelect.addEventListener('change', (e) => handleFilters('users', e.target.value));
statusFilterSelect.addEventListener('change', (e) => handleFilters('status', e.target.value));
searchInput.addEventListener('input', (e) => handleFilters('search', e.target.value));

function initApplication(){
    Promise.all([getAllTodos(),getAllUsers()]).then((values) => {
        [todos, users] = values;

        renderAllTodos(todos);
        users.map(u => {
            renderUserOption(usersSelect, u)
            renderUserOption(usersFilterSelect, u)
        });
    })

}

async function getAllTodos(){
    try {
        let response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=45');
        response = await response.json()
        return response
    } catch (error) {
        alertUser(error)
    }
}

async function getAllUsers(){
    try {
        let response = await fetch('https://jsonplaceholder.typicode.com/users');
        response = await response.json()
        return response
    } catch (error) {
        alertUser(error)
    }
}

async function postNewTodo(newTodo){
    try {
        let response = await fetch('https://jsonplaceholder.typicode.com/todos',{
            method: 'POST',
            body: JSON.stringify(newTodo),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        let newTodoRes = await response.json()
        renderTodoItem(newTodoRes)
        todos = [...todos, newTodoRes]
    } catch (error) {
        alertUser(error)
    }
}

async function toggleTodoStatus(id, status){
    try {
        let response = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`,{
            method: 'PATCH',
            body: JSON.stringify({
                completed: status
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if(!response.ok) throw new Error('Something went wrong')

    } catch (error) {
        alertUser(error)
    }
}

async function removeTodo(id){
    try {
        let response = await fetch(`https://jsonplaceholder.typicode.com/todos/${id}`,{
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if(response.ok){
            removeTodoFromDOM(id)
            todos = todos.filter(it => it.id !== id)
        } else {
            throw new Error('Something went wrong')
        }

    } catch (error) {
        alertUser(error)
    }
}

function getUserNameById(id){
    let user = users.find(user => user.id === id);
    return user.name
}

function removeTodoFromDOM(id){
    let todo = todoList.querySelector(`[data-id="${id}"]`)
    todo.querySelector('input').removeEventListener('change', handleToggleTodoStatus)
    todo.querySelector('.todo-close').removeEventListener('click', handleRemoveTodo)
    todo.remove()
    todos = todos.filter(todo => todo.id !== id)
}

function alertUser(error){
    alert(error.message)
}

function renderAllTodos(todos){
    todoList.innerHTML = '';
    todos.map(todo => renderTodoItem(todo));
}

function renderTodoItem({id, userId, title, completed}){
    let li = document.createElement('li');
    li.innerHTML = `<span class="todo-title" >${title} by <b>${getUserNameById(userId)}</b></span>`;
    li.dataset.id = id;
    li.className = 'todo-item';

    let checkBox = document.createElement('input');
    checkBox.type = 'checkbox';
    checkBox.checked = completed;
    checkBox.addEventListener('change', handleToggleTodoStatus)

    let closeBtn = document.createElement('span');
    closeBtn.className = 'todo-close';
    closeBtn.innerHTML = `&times`;
    closeBtn.addEventListener('click', handleRemoveTodo)

    li.prepend(checkBox);
    li.append(closeBtn);

    todoList.prepend(li)
}

function renderUserOption(node, {id, name}){
    let opt = document.createElement('option');
    opt.value = id;
    opt.innerText = name;

    node.append(opt)
}

function handleSubmitNewTodo(event){
    event.preventDefault();
    postNewTodo({
        title: todoForm.todoText.value,
        userId: +todoForm.todoUser.value,
        completed: false
    })
    todoForm.reset();
}

function handleToggleTodoStatus(){
    let status = this.checked;
    let id = this.closest('li').dataset.id;
    toggleTodoStatus(id, status)
}

function handleRemoveTodo(){
    let id = +this.closest('li').dataset.id;
    let isReady = confirm(`Are you shure that you want to delete this todo?`)
    if(isReady){
        removeTodo(id)
    }
}

function filterByUser(todos, id){
    let filteredTodos = [];
    if(id){
        filteredTodos = todos.filter(todo => todo.userId === id);
        return filteredTodos
    } else {
        return todos
    }
}

function filterByStatus(todos, currentStatus){
    let filteredTodos = []
    let completed = false
    if(currentStatus){
        completed = currentStatus === 1 ? true : false
        filteredTodos = todos.filter(todo => todo.completed === completed)
        return filteredTodos
    } else {
        return todos
    }
}

function filterBySearch(todos, searchString){
    let filteredTodos = []
    if(searchString){
        filteredTodos = todos.filter(todo => todo.title.includes(searchString))
        debugger;
        return filteredTodos
    } else {
        return todos
    }
}

function handleResetFilters(){
    searchInput.value = ""
    usersFilterSelect.value = "0"
    statusFilterSelect.value = "0"
    renderAllTodos(todos)
}

async function handleFilters(type, value){
    let workArr = []
    if(type === 'users'){
        workArr = filterByUser(todos, +value)
        workArr = filterByStatus(workArr, +statusFilterSelect.value)
        workArr = filterBySearch(workArr, searchInput.value)
        renderAllTodos(workArr)
    }

    if(type === 'status'){
        workArr = filterByStatus(todos, +value)
        workArr = filterByUser(workArr, +usersFilterSelect.value)
        workArr = filterBySearch(workArr, searchInput.value)
        renderAllTodos(workArr)
    }

    if(type === 'search'){
        workArr = await debounceFilter(todos, searchInput.value)
        workArr = filterByUser(workArr, +usersFilterSelect.value)
        workArr = filterByStatus(workArr, +statusFilterSelect.value)
        renderAllTodos(workArr)
    }
}

function createDebouncedFunction(fn, delay){
    let timerId

    return function(...args){
        clearTimeout(timerId)
        let result
        return new Promise( resolve => {
            timerId = setTimeout(() => {
                result = fn(...args)
                resolve(result)
            }, delay)
        })
    }
}

const debounceFilter = createDebouncedFunction(filterBySearch, 1000)





