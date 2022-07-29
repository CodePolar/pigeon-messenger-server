class User {
    constructor() {
        this.users = [];
    }

    addUser(id, name, room) {
        this.users.push({ id, name, room });
    }

    addRoom(id, room) {
        let {user, index} = this.getUser(id);
        if(!user.room) {
            user.room = [...[room]]            
        } else {
            user.room = [...user.room, ...[room]]
        }
        this.users[index] = user;
    }  

    getUser(id) {
        let user = this.users.filter(r => r.id === id)[0];
        let index = this.users.indexOf(user);

        return {user, index};
    }

    getUsers() {
        return this.users;
    }

    getRoomUsers(room) {
        return this.users.filter(r => r.room.indexOf(room) >= 0);
    }

    removeUser(id) {
        const deletedUser = this.getUser(id);
        this.users = this.users.filter(r => r.id !== id);

        return deletedUser;
    }
}

module.exports = User;