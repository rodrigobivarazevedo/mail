document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});


function compose_email() {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // Select the success and error message containers
  const successMessage = document.querySelector('#success-message');
  const errorMessage = document.querySelector('#error-message');

  // Add event listener for form submission
  document.querySelector('#compose-form').onsubmit = function(event) {
      event.preventDefault();

      // Get form values
      const recipients = document.querySelector('#compose-recipients').value;
      const subject = document.querySelector('#compose-subject').value;
      const body = document.querySelector('#compose-body').value;

      // Send email data to server
      fetch('/emails', {
          method: 'POST',
          body: JSON.stringify({
              recipients: recipients,
              subject: subject,
              body: body
          })
      })
      .then(response => {
          if (!response.ok) {
              // Display error message
              return response.json().then(data => {
                  errorMessage.textContent = data.error;
                  errorMessage.style.display = 'block';
                  // Hide error message after 3 seconds
                  setTimeout(() => {
                      errorMessage.style.display = 'none';
                  }, 3000);
                  throw new Error(data.error); // throw error to catch block
              });
          } else {
              return response.json();
          }
      })
      .then(result => {
          // Print result
          console.log(result);
          load_mailbox("sent");
          // Display success message
          successMessage.textContent = result.message;
          successMessage.style.display = 'block';
          // Hide success message after 3 seconds
          setTimeout(() => {
              successMessage.style.display = 'none';
          }, 3000);
      })
      .catch(error => {
          console.error('Error:', error);
          // No need to display error message here, it's already handled in the previous .then() block
      });
  };
}



function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#emails-view').style.display = 'block';

  // Fetch emails
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      // Clear previous emails
      document.querySelector('#emails-view').innerHTML = '';

      // Add mailbox title
      const mailboxTitle = document.createElement('h3');
      mailboxTitle.textContent = mailbox.charAt(0).toUpperCase() + mailbox.slice(1);
      document.querySelector('#emails-view').appendChild(mailboxTitle);

      // Create list group
      const listGroup = document.createElement('div');
      listGroup.classList.add('list-group');
      document.querySelector('#emails-view').appendChild(listGroup);

      // Loop through emails and create list items for each email
      emails.forEach(email => {
        const emailItem = document.createElement('button');
        // Determine the class based on the read attribute
         // Set background color based on read status
         if (email.read) {
          emailItem.style.backgroundColor = '#f0f0f0'; // Light grey background for read emails
        }
        emailItem.classList.add("list-group-item", 'list-group-item-action');
  
        if (mailbox == "inbox"){
          emailItem.innerHTML = `
          <div class="d-flex w-100 justify-content-between">
            <p class="mb-1">From: <strong>${email.sender}</strong></p>
            <small>${email.timestamp}  <button class="btn btn-secondary btn-sm archive-button">Archive</button> </small>
          </div>
          <p class="mb-1">Subject: <strong>${email.subject}</strong></p>
          
        `;
        } else if (mailbox =="archive") {
          if (email.sender == email.user){
              emailItem.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
              <h6 class="mb-1">To: <strong>${email.recipients}</strong></h6>
              <small>${email.timestamp}  <button class="btn btn-secondary btn-sm archive-button">Unarchive</button></small>  
            </div>
            <p class="mb-1">Subject: <strong>${email.subject}</strong></p>
          `;
          } else {
            emailItem.innerHTML = `
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">From: <strong>${email.sender}</strong></h6>
            <small>${email.timestamp}  <button class="btn btn-secondary btn-sm archive-button">Unarchive</button></small>  
          </div>
          <p class="mb-1">Subject: <strong>${email.subject}</strong></p>
        `;
          }
          
        } else {
          emailItem.innerHTML = `
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">To: <strong>${email.recipients}</strong></h6>
            <small>${email.timestamp}  <button class="btn btn-secondary btn-sm archive-button">Archive</button></small>
          </div>
          <p class="mb-1">Subject: <strong>${email.subject}</strong></p>
        
        `;
        }

        emailItem.querySelector('.archive-button').addEventListener('click', function(event) {
          //event.stopPropagation(); // Prevent click event from bubbling to email item
          const isArchived = email.archived;
          const newArchiveState = !isArchived; // Toggle the archive state
          const targetmailbox = mailbox
          archiveEmail(email.id, newArchiveState, targetmailbox);
        })
       

        emailItem.addEventListener('click', function() {
          // Fetch details of the clicked email
          fetch(`/emails/${email.id}`)
            .then(response => response.json())
            .then(clickedEmail => {
              // Clear emails view
              document.querySelector('#emails-view').innerHTML = '';

              // Create div for clicked email details
              const clickedEmailElement = document.createElement('div');
              clickedEmailElement.classList.add('email');

              // Update read status of the email
              fetch(`/emails/${email.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    read: true
                })
            })

               if (email.sender == email.user){
                clickedEmailElement.innerHTML = `
                <div class="email-details">
                  <p><strong>To:</strong> ${clickedEmail.recipients}</p>
                  <p><strong>Subject:</strong> ${clickedEmail.subject}</p>
                  <p><strong>Timestamp:</strong> ${clickedEmail.timestamp}</p>
                  <p><strong>Body:</strong> ${clickedEmail.body}</p>
                </div>
              `;
              } else {
                clickedEmailElement.innerHTML = `
                <div class="email-details">
                  <p><strong>From:</strong> ${clickedEmail.sender}</p>
                  <p><strong>Subject:</strong> ${clickedEmail.subject}</p>
                  <p><strong>Timestamp:</strong> ${clickedEmail.timestamp}</p>
                  <p><strong>Body:</strong> ${clickedEmail.body}</p>
                </div>
              `;
              }
              
              document.querySelector('#emails-view').appendChild(clickedEmailElement);
            });
        });
        listGroup.appendChild(emailItem);
      });
    });
}



function archiveEmail(emailId, newArchiveState, targetmailbox) {
  // Determine the target mailbox based on the newArchiveState
  //const targetMailbox = newArchiveState ? 'inbox' : 'archive';

  // Send PUT request to archive email
  fetch(`/emails/${emailId}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: newArchiveState
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to archive email.');
    }
    
    // Load the appropriate mailbox after archiving
    load_mailbox(targetmailbox);
  })
  .catch(error => {
    console.error('Error:', error);
    // Handle error
  });
}
